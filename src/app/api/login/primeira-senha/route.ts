import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';
import { senhaNumerica6Valida } from '@/lib/senha-portal';
import { selectColaboradorLoginRowByLogin, updateSenhaColaboradorByIdCompat } from '@/lib/colaborador-forca-troca-compat';
import { parseManterLogado } from '@/lib/portal-login-persist';
import {
  applyAdminSessionCookie,
  applyPortalSessionCookies,
  rolesComAcessoAdmin,
} from '@/lib/portal-session-cookies';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Primeiro acesso: define senha quando ainda não existe hash no banco.
 */
export async function POST(req: Request) {
  let body: {
    login?: string;
    telefone?: string;
    senha?: string;
    senhaConfirmacao?: string;
    manter_logado?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos' }, { status: 400 });
  }

  const loginInput = String(body.login ?? body.telefone ?? '').trim();
  const senha = String(body.senha ?? '').trim();
  const senha2 = String(body.senhaConfirmacao ?? '').trim();

  if (!loginInput) {
    return NextResponse.json({ ok: false, erro: 'Informe celular ou e-mail.' }, { status: 400 });
  }
  if (!senhaNumerica6Valida(senha)) {
    return NextResponse.json(
      { ok: false, erro: 'A senha deve ter exatamente 6 números.' },
      { status: 400 }
    );
  }
  if (senha !== senha2) {
    return NextResponse.json({ ok: false, erro: 'As senhas não coincidem.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, loginCanonical, error } = await selectColaboradorLoginRowByLogin(supabase, loginInput);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message || 'Erro ao consultar cadastro.' }, { status: 500 });
    }
    if (!col) {
      return NextResponse.json({ ok: false, erro: 'Login não cadastrado.' }, { status: 404 });
    }

    if ((col as { senha_hash?: string | null }).senha_hash) {
      return NextResponse.json(
        { ok: false, erro: 'Senha já cadastrada. Use o login com telefone e senha.' },
        { status: 400 }
      );
    }

    const hash = hashPassword(senha);
    const { error: upErr } = await updateSenhaColaboradorByIdCompat(supabase, col.id, hash, true);

    if (upErr) {
      return NextResponse.json({ ok: false, erro: 'Não foi possível salvar a senha.' }, { status: 500 });
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
    if (payload.ok && !('needsPassword' in payload) && !('mustCompleteCpf' in payload)) {
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
