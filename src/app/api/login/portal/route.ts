import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/password';
import { buildPortalLoginJson } from '@/lib/portal-login-response';
import { selectColaboradorLoginRowByLogin } from '@/lib/colaborador-forca-troca-compat';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Login do portal por celular OU e-mail + senha — consulta no servidor (contorna RLS do Supabase).
 * Sem senha cadastrada: retorna needsPassword para o cliente abrir fluxo de primeira senha.
 */
export async function POST(req: Request) {
  let body: { login?: string; telefone?: string; senha?: string };
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
    const { data: col, loginCanonical, error: fetchErr } = await selectColaboradorLoginRowByLogin(
      supabase,
      loginInput
    );

    if (fetchErr) {
      return NextResponse.json({ ok: false, erro: fetchErr.message || 'Erro ao consultar cadastro.' }, { status: 500 });
    }
    if (!col) {
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
      return NextResponse.json({ ok: false, erro: 'Senha incorreta.' }, { status: 401 });
    }

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

    const payload = buildPortalLoginJson(
      {
        id: col.id,
        unidade_id: col.unidade_id,
        role: (col as { role?: string }).role,
        onboarding_completo: (col as { onboarding_completo?: boolean }).onboarding_completo,
      },
      loginCanonical || loginInput,
      cpfPendente ? { cpfPendente: true } : undefined
    );

    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
