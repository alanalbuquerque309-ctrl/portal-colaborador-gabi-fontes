import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularRankingLiderInspirador } from '@/lib/lider-inspirador';

export const dynamic = 'force-dynamic';

/** Vencedor semanal do Líder Inspirador (público para quem está logado). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await calcularRankingLiderInspirador(supabase);

    return NextResponse.json(
      {
        ok: true,
        semana_inicio: resultado.semana_inicio,
        semana_rotulo: resultado.semana_rotulo,
        vencedor: resultado.vencedor,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
