import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcularTop3GeralSemana,
  calcularTop3PorUnidadeSemana,
} from '@/lib/mural-ranking-unidade';
import { calcularRankingTrofeusSemanaCompleto } from '@/lib/mural-ranking-trofeus-pares';
import { segundaSemanaSaoPaulo, rotuloSemanaSaoPaulo } from '@/lib/semana-brasil';

export const dynamic = 'force-dynamic';

/** Top 3 da semana (rede + por unidade) e troféus entre pares da semana. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const semanaInicio = segundaSemanaSaoPaulo();

    const [geral, porUnidade, trofeus] = await Promise.all([
      calcularTop3GeralSemana(supabase, semanaInicio),
      calcularTop3PorUnidadeSemana(supabase, semanaInicio),
      calcularRankingTrofeusSemanaCompleto(supabase, semanaInicio).catch(() => ({
        semana_inicio: semanaInicio,
        ranking: [],
      })),
    ]);

    return NextResponse.json(
      {
        ok: true,
        semana_inicio: semanaInicio,
        semana_rotulo: rotuloSemanaSaoPaulo(semanaInicio),
        ranking_geral_top3: geral.top,
        ranking_por_unidade: porUnidade.unidades,
        ranking_trofeus: trofeus.ranking,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
