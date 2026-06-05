import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcularTop3GeralRede,
  calcularTop3PorUnidadeRede,
  mesAtualUTC,
} from '@/lib/mural-ranking-unidade';
import { calcularRankingTrofeusMesCompleto } from '@/lib/mural-ranking-trofeus-pares';
import { AVALIACAO_RANKING_MIN_SEMANAS } from '@/lib/avaliacao-ranking';

export const dynamic = 'force-dynamic';

/** Rankings de avaliações (geral + por unidade) e troféus entre pares do mês. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const atual = mesAtualUTC();

    const [geral, porUnidade, trofeus] = await Promise.all([
      calcularTop3GeralRede(supabase, { ano: atual.ano, mes: atual.mes }),
      calcularTop3PorUnidadeRede(supabase, { ano: atual.ano, mes: atual.mes }),
      calcularRankingTrofeusMesCompleto(supabase, { ano: atual.ano, mes: atual.mes }).catch(() => ({
        mes_referencia: atual.mesRef,
        ranking: [],
      })),
    ]);

    return NextResponse.json(
      {
        ok: true,
        mes_referencia: atual.mesRef,
        min_semanas_ranking_mensal: AVALIACAO_RANKING_MIN_SEMANAS,
        ranking_geral_top3: geral.top,
        ranking_por_unidade: porUnidade.unidades,
        ranking_trofeus: trofeus.ranking,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
