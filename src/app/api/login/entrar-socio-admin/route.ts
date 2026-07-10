import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/password';
import { selectColaboradorLoginRowByLogin } from '@/lib/colaborador-forca-troca-compat';
import { normalizePortalRole } from '@/lib/roles';
import { parseManterLogado } from '@/lib/portal-login-persist';
import { applyAdminSessionCookie, applyPortalSessionCookies } from '@/lib/portal-session-cookies';
import { sincronizarOnboardingGestaoNoBanco } from '@/lib/onboarding-access';
import { destinoHomeAposLogin } from '@/lib/portal-login-response';

/**
 * Legado: sessão sócio/admin após senha validada.
 */
export async function POST(req: Request) {
  let body: { login?: string; telefone?: string; senha?: string; manter_logado?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const loginInput = String(body.login ?? body.telefone ?? '').trim();
  const senha = String(body.senha ?? '').trim();

  if (!loginInput) {
    return NextResponse.json({ ok: false, erro: 'Informe celular ou e-mail.' }, { status: 400 });
  }
  if (!senha) {
    return NextResponse.json({ ok: false, erro: 'Informe sua senha.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await selectColaboradorLoginRowByLogin(supabase, loginInput);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message || 'Erro ao consultar cadastro' }, { status: 500 });
    }
    if (!col) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((col as { role?: string }).role);
    if (role !== 'socio' && role !== 'admin') {
      return NextResponse.json({ ok: false, erro: 'Acesso apenas para sócios e administradores' }, { status: 403 });
    }

    const senhaHash = (col as { senha_hash?: string | null }).senha_hash;
    if (!senhaHash || !verifyPassword(senha, senhaHash)) {
      return NextResponse.json({ ok: false, erro: 'Senha incorreta.' }, { status: 401 });
    }

    const onboardingCompleto = await sincronizarOnboardingGestaoNoBanco(
      supabase,
      col.id,
      role,
      (col as { onboarding_completo?: boolean }).onboarding_completo
    );

    const res = NextResponse.json({
      ok: true,
      colaborador: { id: col.id, unidade_id: col.unidade_id, role },
      redirect: onboardingCompleto
        ? destinoHomeAposLogin(role)
        : `/onboarding?colaborador_id=${col.id}&unidade_id=${col.unidade_id}`,
    });

    const persistent = parseManterLogado(body);
    applyPortalSessionCookies(res, { id: col.id, unidade_id: col.unidade_id, role }, { persistent });
    applyAdminSessionCookie(res, { persistent });

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
