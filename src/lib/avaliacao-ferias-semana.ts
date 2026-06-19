import type { SupabaseClient } from '@supabase/supabase-js';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import { buscarAvaliacaoSemanaColaborador } from '@/lib/graos/elegibilidade';

export const MOTIVO_BLOQUEIO_LIDERANCA_FERIAS =
  'Você está registrado(a) de férias nesta semana — avaliação de liderança não se aplica.';

/** Há avaliação de equipe/RH com assiduidade «férias» na segunda `semanaInicio`. */
export async function colaboradorDeFeriasNaSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const row = await buscarAvaliacaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
  if (!row) return false;
  return assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa) === 'ferias';
}

/** Cancela crédito de «Avaliar liderança» e reprocessa Grãos da semana. */
export async function aplicarEfeitosFeriasSemanaColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<void> {
  const ferias = await colaboradorDeFeriasNaSemana(supabase, colaboradorId, semanaInicio);
  if (!ferias) return;

  await supabase
    .from('graos_movimentos')
    .update({
      estado: 'cancelado',
      meta: { ajuste_sistema: 'ferias_sem_lideranca', oculto_colaborador: true },
    })
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio)
    .eq('missao', 'lideranca_semana')
    .neq('estado', 'cancelado');

  const { reprocessarGraosAposAvaliacaoEquipe } = await import('@/lib/graos/sync-hook');
  await reprocessarGraosAposAvaliacaoEquipe(supabase, colaboradorId, semanaInicio);
}
