import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';
import { selectColaboradorLoginRowByLogin } from '@/lib/colaborador-forca-troca-compat';
import { perfilPessoalCompletoPorId } from '@/lib/colaborador-perfil-login';
import { normalizePortalRole } from '@/lib/roles';
import { parseManterLogado } from '@/lib/portal-login-persist';
import { sincronizarOnboardingGestaoNoBanco } from '@/lib/onboarding-access';
import {
  applyAdminSessionCookie,
  applyPortalSessionCookies,
  rolesComAcessoAdmin,
} from '@/lib/portal-session-cookies';
import {
  ipDaRequisicao,
  limparTentativas,
  mensagemBloqueio,
  registrarTentativa,
  verificarRegras,
  type RateLimitRegra,
} from '@/lib/rate-limit';

// Lockout de força bruta: janela curta, limite por identidade e (mais frouxo) por IP (NAT/compartilhado).
const RL_JANELA_MS = 15 * 60 * 1000; // 15 min
const RL_MAX_IDENTIDADE = 8;
const RL_MAX_IP = 40;

/**
 * Login do portal por celular OU e-mail + senha — consulta no servidor (contorna RLS do Supabase).
 * Sem senha cadastrada: retorna needsPassword para o cliente abrir fluxo de primeira senha.
 */
export async function POST(req: Request) {
  let body: { login?: string; telefone?: string; senha?: string; manter_logado?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const loginInput = String(body.login ?? body.telefone ?? '').trim();
  const senhaTrim = String(body.senha ?? '').trim();

  if (!loginInput) {
    return NextResponse.json({ ok: false, erro: 'Informe celular ou e-mail.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const ip = ipDaRequisicao(req);
    const idKey = loginInput.toLowerCase();
    const regrasRL: RateLimitRegra[] = [
      { escopo: 'login', tipoChave: 'identidade', chave: idKey, janelaMs: RL_JANELA_MS, maxFalhas: RL_MAX_IDENTIDADE },
      { escopo: 'login', tipoChave: 'ip', chave: ip, janelaMs: RL_JANELA_MS, maxFalhas: RL_MAX_IP },
    ];
    const registrarFalhaLogin = async () => {
      await registrarTentativa(supabase, { escopo: 'login', tipoChave: 'identidade', chave: idKey });
      await registrarTentativa(supabase, { escopo: 'login', tipoChave: 'ip', chave: ip });
    };

    const bloqueio = await verificarRegras(supabase, regrasRL);
    if (bloqueio) {
      return NextResponse.json(
        { ok: false, erro: mensagemBloqueio(bloqueio.retryAposMs) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(bloqueio.retryAposMs / 1000)) } }
      );
    }

    const { data: col, loginCanonical, error: fetchErr } = await selectColaboradorLoginRowByLogin(
      supabase,
      loginInput
    );

    if (fetchErr) {
      return NextResponse.json({ ok: false, erro: fetchErr.message || 'Erro ao consultar cadastro.' }, { status: 500 });
    }
    if (!col) {
      await registrarFalhaLogin();
      return NextResponse.json(
        { ok: false, erro: 'Login não cadastrado. Entre em contato com o RH.' },
        { status: 404 }
      );
    }

    const senhaHash = (col as { senha_hash?: string | null }).senha_hash;

    if (!senhaHash) {
      return NextResponse.json({
        ok: true,
        needsPassword: true,
        login: loginCanonical,
      });
    }

    if (!senhaTrim) {
      return NextResponse.json({ ok: false, erro: 'Digite sua senha.' }, { status: 400 });
    }

    if (!verifyPassword(senhaTrim, senhaHash)) {
      await registrarFalhaLogin();
      return NextResponse.json({ ok: false, erro: 'Senha incorreta.' }, { status: 401 });
    }

    // Senha correta: zera o contador de falhas desta identidade e do IP.
    await limparTentativas(supabase, { escopo: 'login', tipoChave: 'identidade', chave: idKey });
    await limparTentativas(supabase, { escopo: 'login', tipoChave: 'ip', chave: ip });

    const forcaTroca = (col as { forca_troca_senha?: boolean | null }).forca_troca_senha === true;
    if (forcaTroca) {
      return NextResponse.json({
        ok: true,
        mustChangePassword: true,
        login: loginCanonical,
        colaborador: {
          id: col.id,
          unidade_id: col.unidade_id,
          role: normalizePortalRole((col as { role?: string }).role),
        },
      });
    }

    const cpfPendente = !String((col as { cpf?: string | null }).cpf ?? '').trim();
    const perfilCompleto = await perfilPessoalCompletoPorId(supabase, col.id);
    const roleNorm = normalizePortalRole((col as { role?: string }).role);
    const onboardingCompleto = await sincronizarOnboardingGestaoNoBanco(
      supabase,
      col.id,
      roleNorm,
      (col as { onboarding_completo?: boolean }).onboarding_completo
    );

    const colRow = {
      id: col.id,
      unidade_id: col.unidade_id,
      role: (col as { role?: string }).role,
      onboarding_completo: onboardingCompleto,
      perfil_completo: perfilCompleto,
    };

    const payload = buildPortalLoginJson(
      colRow,
      loginCanonical || loginInput,
      cpfPendente ? { cpfPendente: true } : undefined
    );

    const res = NextResponse.json(payload);
    const persistent = parseManterLogado(body);
    if (
      payload.ok &&
      !('needsPassword' in payload) &&
      !('mustChangePassword' in payload) &&
      !('mustCompleteCpf' in payload)
    ) {
      applyPortalSessionCookies(
        res,
        {
          id: col.id,
          unidade_id: col.unidade_id,
          role: roleNorm,
        },
        { persistent }
      );
      if (rolesComAcessoAdmin(roleNorm)) {
        applyAdminSessionCookie(res, { persistent });
      }
    }
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
