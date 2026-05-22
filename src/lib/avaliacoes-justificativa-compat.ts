import type { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const SELECT_COM_JUST =
  'colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, media_dia, justificativa_nota_baixa';

const SELECT_SEM_JUST =
  'colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, media_dia';

function faltaColunaJustificativa(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('justificativa_nota_baixa') && m.includes('does not exist');
}

export type AvaliacaoDiariaLeitura = {
  colaborador_id: string;
  assiduidade: string;
  nota_vestimenta: number | null;
  nota_pontualidade: number | null;
  nota_trabalho_equipe: number | null;
  nota_desempenho_tarefas: number | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
};

/** Lê avaliações da semana; se migration 028 não foi aplicada, omite a coluna de justificativa. */
export async function selectAvaliacoesDiariasPorColaboradores(
  supabase: SupabaseAdmin,
  dataReferencia: string,
  colaboradorIds: string[]
): Promise<{ rows: AvaliacaoDiariaLeitura[]; error: string | null }> {
  if (colaboradorIds.length === 0) return { rows: [], error: null };

  const com = await supabase
    .from('avaliacoes_diarias')
    .select(SELECT_COM_JUST)
    .eq('data_referencia', dataReferencia)
    .in('colaborador_id', colaboradorIds);
  if (!com.error) {
    return { rows: (com.data ?? []) as AvaliacaoDiariaLeitura[], error: null };
  }
  if (!faltaColunaJustificativa(com.error.message)) {
    return { rows: [], error: com.error.message };
  }

  const sem = await supabase
    .from('avaliacoes_diarias')
    .select(SELECT_SEM_JUST)
    .eq('data_referencia', dataReferencia)
    .in('colaborador_id', colaboradorIds);
  if (sem.error) return { rows: [], error: sem.error.message };
  const rows = (sem.data ?? []).map((r) => ({
    ...(r as AvaliacaoDiariaLeitura),
    justificativa_nota_baixa: null,
  }));
  return { rows, error: null };
}

/** Insert com justificativa; se coluna não existir, grava sem o campo. */
export async function insertAvaliacaoDiariaCompat(
  supabase: SupabaseAdmin,
  row: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('avaliacoes_diarias').insert(row);
  if (!error) return { error: null };
  if (!faltaColunaJustificativa(error.message)) return { error: error.message };

  const { justificativa_nota_baixa: _j, ...semJust } = row;
  const retry = await supabase.from('avaliacoes_diarias').insert(semJust);
  return { error: retry.error?.message ?? null };
}
