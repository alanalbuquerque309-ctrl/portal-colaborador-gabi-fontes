import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/password';

/**
 * Sócios e admins entram direto (sem onboarding), após senha já validada no login.
 * Marca onboarding_completo=true e retorna dados para sessão.
 * Exige CPF + senha para evitar chamada só com CPF.
 */
export async function POST(req: Request) {
  let body: { cpf?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const cpf = String(body.cpf ?? '').replace(/\D/g, '');
  const senha = String(body.senha ?? '').trim();

  if (cpf.length !== 11) {
    return NextResponse.json({ ok: false, erro: 'CPF inválido' }, { status: 400 });
  }
  if (!senha) {
    return NextResponse.json({ ok: false, erro: 'Informe sua senha.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role, onboarding_completo, senha_hash')
      .eq('cpf', cpf)
      .single();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const role = (col as { role?: string }).role;
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
      colaborador: { id: col.id, unidade_id: col.unidade_id, role: role || 'socio' },
    });

    const opts = { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false, SameSite: 'lax' as const };
    res.cookies.set('portal_colaborador_id', col.id, opts);
    res.cookies.set('portal_unidade_id', col.unidade_id, opts);
    res.cookies.set('portal_role', role || 'socio', opts);

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
