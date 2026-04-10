import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

const ROLES = ['colaborador', 'admin', 'socio', 'master'] as const;

/** Altera o role de um colaborador. Sócios recebem onboarding_completo=true. */
export async function PATCH(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const role = searchParams.get('role');

  if (!id || !role) {
    return NextResponse.json({ ok: false, erro: 'id e role são obrigatórios' }, { status: 400 });
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ ok: false, erro: 'Role inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const payload: Record<string, unknown> = { role };
    if (role === 'socio' || role === 'admin' || role === 'master') {
      payload.onboarding_completo = true;
      payload.termo_aceite_em = new Date().toISOString();
    }

    const { error } = await supabase
      .from('colaboradores')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
