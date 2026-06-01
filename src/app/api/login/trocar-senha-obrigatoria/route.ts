import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword, verifyPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';
import { senhaNumerica6Valida } from '@/lib/senha-portal';
import {
  selectColaboradorLoginRowByLogin,
  updateSenhaColaboradorByIdCompat,
} from '@/lib/colaborador-forca-troca-compat';
import { parseManterLogado } from '@/lib/portal-login-persist';
import {
  applyAdminSessionCookie,
  applyPortalSessionCookies,
  rolesComAcessoAdmin,
} from '@/lib/portal-session-cookies';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Troca senha quando `forca_troca_senha` ou senha atual é a padrão (123456).
 * Nova senha: exatamente 6 dígitos numéricos.
 */
export async function POST(req: Request) {
  let body: {
    login?: string;
    telefone?: string;
    senha_atual?: string;
    senha_nova?: string;
    senha_confirmacao?: string;
    manter_logado?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const loginInput = String(body.login ?? body.telefone ?? '').trim();
  const senhaAtual = String(body.senha_atual ?? '').trim();
  const senhaNova = String(body.senha_nova ?? '').trim();
  const senha2 = String(body.senha_confirmacao ?? '').trim();

  if (!loginInput) {
    return NextResponse.json({ ok: false, erro: 'Informe celular ou e-mail.' }, { status: 400 });
  }
  if (!senhaAtual) {
    return NextResponse.json({ ok: false, erro: 'Informe a senha atual.' }, { status: 400 });
  }
  if (!senhaNumerica6Valida(senhaNova)) {
    return NextResponse.json(
      { ok: false, erro: 'A nova senha deve ter exatamente 6 números.' },
      { status: 400 }
    );
  }
  if (senhaNova !== senha2) {
    return NextResponse.json({ ok: false, erro: 'A confirmação não confere.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, loginCanonical, error: fetchErr } = await selectColaboradorLoginRowByLogin(
      supabase,
      loginInput
    );

    if (fetchErr) {
      return NextResponse.json({ ok: false, erro: fetchErr.message || 'Erro ao consultar cadastro.' }, { status: 500 });
    }
    if (!col) {
      return NextResponse.json({ ok: false, erro: 'Login não cadastrado.' }, { status: 404 });
    }

    const senhaHash = (col as { senha_hash?: string | null }).senha_hash;
    if (!senhaHash || !verifyPassword(senhaAtual, senhaHash)) {
      return NextResponse.json({ ok: false, erro: 'Senha atual incorreta.' }, { status: 401 });
    }

    const hash = hashPassword(senhaNova);
    const { error: upErr } = await updateSenhaColaboradorByIdCompat(supabase, col.id, hash, true);

    if (upErr) {
      return NextResponse.json({ ok: false, erro: 'Não foi possível salvar a nova senha.' }, { status: 500 });
    }

    const cpfPendente = !String((col as { cpf?: string | null }).cpf ?? '').trim();

    const colRow = {
      id: col.id,
      unidade_id: col.unidade_id,
      role: (col as { role?: string }).role,
      onboarding_completo: (col as { onboarding_completo?: boolean }).onboarding_completo,
    };

    const payload = buildPortalLoginJson(
      colRow,
      loginCanonical || loginInput,
      cpfPendente ? { cpfPendente: true } : undefined
    );

    const res = NextResponse.json(payload);
    const roleNorm = normalizePortalRole(colRow.role);
    const persistent = parseManterLogado(body);
    if (payload.ok && !('mustCompleteCpf' in payload)) {
      applyPortalSessionCookies(
        res,
        { id: col.id, unidade_id: col.unidade_id, role: roleNorm },
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
