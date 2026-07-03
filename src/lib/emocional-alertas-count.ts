import type { SupabaseClient } from '@supabase/supabase-js';
import { dataCivilBr } from '@/lib/data-civil-br';
import { EMOCOES_ALERTA_GESTAO } from '@/lib/emocional-opcoes';

/** Quantos alertas do termômetro o gestor ainda não marcou como vistos hoje. */
export async function contarAlertasEmocionalNaoVistos(
  supabase: SupabaseClient,
  viewerColaboradorId: string
): Promise<number> {
  const hoje = dataCivilBr();

  const { data: vistos, error: errVistos } = await supabase
    .from('emocional_alertas_vistos')
    .select('colaborador_id')
    .eq('viewer_colaborador_id', viewerColaboradorId)
    .eq('data', hoje);

  if (errVistos) return 0;

  const idsVistos = new Set((vistos ?? []).map((v) => String(v.colaborador_id)));

  const selects = ['emocao, motivo, colaborador_id', 'emocao, colaborador_id'] as const;

  for (const sel of selects) {
    const res = await supabase
      .from('emocional_registro')
      .select(sel)
      .eq('data', hoje)
      .in('emocao', [...EMOCOES_ALERTA_GESTAO]);

    if (!res.error) {
      const ids = new Set(
        (res.data ?? []).map((row) => String((row as { colaborador_id?: string }).colaborador_id ?? ''))
      );
      let n = 0;
      for (const id of Array.from(ids)) {
        if (id && !idsVistos.has(id)) n += 1;
      }
      return n;
    }
    if (!/motivo|column .* does not exist|schema cache/i.test(res.error.message)) break;
  }

  return 0;
}
