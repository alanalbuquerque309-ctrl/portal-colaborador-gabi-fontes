import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { verificarBloqueioQuintaLider } from '@/lib/graos/lider-quinta-bloqueio';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();

    const role = normalizePortalRole((colab as { role?: string }).role);
    const isLider = role === 'gerente' || role === 'master' || role === 'admin';
    if (!isLider || !unidadeId) {
      return NextResponse.json({ ok: true, bloqueado: false, pendentes: 0, motivo: null }, { headers: NO_STORE });
    }

    const bloqueio = await verificarBloqueioQuintaLider(supabase, colaboradorId, unidadeId);
    return NextResponse.json({ ok: true, ...bloqueio }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
