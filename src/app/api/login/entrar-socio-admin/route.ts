import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/password';
import { selectColaboradorLoginRowByLogin } from '@/lib/colaborador-forca-troca-compat';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Sócios e admins entram direto (sem onboarding), após senha já validada no login.
 * Marca onboarding_completo=true e retorna dados para sessão.
 * Exige telefone + senha para evitar chamada só com identificador.
 */
export async function POST(req: Request) {
  let body: { login?: string; telefone?: string; senha?: string };
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

    if (!(col as { onboarding_completo?: boolean }).onboarding_completo) {
      await supabase
        .from('colaboradores')
        .update({
          onboarding_completo: true,
          termo_aceite_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', col.id);
    }

    const res = NextResponse.json({
      ok: true,
      colaborador: { id: col.id, unidade_id: col.unidade_id, role },
    });

    const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false, SameSite: 'lax' as const };
    res.cookies.set('portal_colaborador_id', col.id, opts);
    res.cookies.set('portal_unidade_id', col.unidade_id, opts);
    res.cookies.set('portal_role', role, opts);

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
