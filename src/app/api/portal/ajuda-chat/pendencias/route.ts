import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canVisualizarAjuda } from '@/lib/roles';

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, role')
      .eq('id', colaboradorId)
      .maybeSingle();
    const role = (eu as { role?: string } | null)?.role;
    if (errEu || !eu || !canVisualizarAjuda(role, colaboradorId)) {
      return NextResponse.json({ ok: true, pendentes: 0 });
    }

    const { count, error } = await supabase
      .from('ajuda_chat')
      .select('id', { count: 'exact', head: true })
      .is('respondido_em', null);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, pendentes: typeof count === 'number' ? count : 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
