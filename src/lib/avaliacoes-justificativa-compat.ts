import type { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const SELECT_COM_JUST =
  'id, colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, media_dia, justificativa_nota_baixa, edicao_utilizada';

const SELECT_SEM_JUST =
  'id, colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, media_dia, edicao_utilizada';

const SELECT_SEM_EDICAO =
  'id, colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, media_dia, justificativa_nota_baixa';

const SELECT_MINIMO =
  'id, colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, media_dia';

function faltaColunaJustificativa(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('justificativa_nota_baixa') && m.includes('does not exist');
}

export type AvaliacaoDiariaLeitura = {
  id?: string;
  colaborador_id: string;
  assiduidade: string;
  nota_vestimenta: number | null;
  nota_pontualidade: number | null;
  nota_trabalho_equipe: number | null;
  nota_desempenho_tarefas: number | null;
  nota_proatividade?: number | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
  edicao_utilizada?: boolean;
};

function faltaColunaEdicao(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('edicao_utilizada') && m.includes('does not exist');
}

function normalizarLinhaLeitura(r: Record<string, unknown>): AvaliacaoDiariaLeitura {
  return {
    ...(r as AvaliacaoDiariaLeitura),
    edicao_utilizada: r.edicao_utilizada === true,
    justificativa_nota_baixa:
      r.justificativa_nota_baixa === undefined ? null : (r.justificativa_nota_baixa as string | null),
  };
}

/** Lê avaliações da semana; se migration 028 não foi aplicada, omite a coluna de justificativa. */
export async function selectAvaliacoesDiariasPorColaboradores(
  supabase: SupabaseAdmin,
  dataReferencia: string,
  colaboradorIds: string[],
  avaliadorId?: string | null
): Promise<{ rows: AvaliacaoDiariaLeitura[]; error: string | null }> {
  if (colaboradorIds.length === 0) return { rows: [], error: null };

  let com = supabase
    .from('avaliacoes_diarias')
    .select(SELECT_COM_JUST)
    .eq('data_referencia', dataReferencia)
    .in('colaborador_id', colaboradorIds);
  if (avaliadorId) com = com.eq('avaliador_id', avaliadorId);

  const comRes = await com;
  if (!comRes.error) {
    return {
      rows: (comRes.data ?? []).map((r) => normalizarLinhaLeitura(r as Record<string, unknown>)),
      error: null,
    };
  }
  if (faltaColunaEdicao(comRes.error.message) && !faltaColunaJustificativa(comRes.error.message)) {
    let semEd = supabase
      .from('avaliacoes_diarias')
      .select(SELECT_SEM_EDICAO)
      .eq('data_referencia', dataReferencia)
      .in('colaborador_id', colaboradorIds);
    if (avaliadorId) semEd = semEd.eq('avaliador_id', avaliadorId);
    const semEdRes = await semEd;
    if (!semEdRes.error) {
      return {
        rows: (semEdRes.data ?? []).map((r) => normalizarLinhaLeitura(r as Record<string, unknown>)),
        error: null,
      };
    }
  }
  if (!faltaColunaJustificativa(comRes.error.message)) {
    return { rows: [], error: comRes.error.message };
  }

  let sem = supabase
    .from('avaliacoes_diarias')
    .select(SELECT_MINIMO)
    .eq('data_referencia', dataReferencia)
    .in('colaborador_id', colaboradorIds);
  if (avaliadorId) sem = sem.eq('avaliador_id', avaliadorId);
  const semRes = await sem;
  if (semRes.error) return { rows: [], error: semRes.error.message };
  const rows = (semRes.data ?? []).map((r) =>
    normalizarLinhaLeitura({
      ...(r as Record<string, unknown>),
      justificativa_nota_baixa: null,
      edicao_utilizada: false,
    })
  );
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

/** Atualiza avaliação existente (edição única); omite colunas opcionais se migration não aplicada. */
export async function updateAvaliacaoDiariaCompat(
  supabase: SupabaseAdmin,
  id: string,
  row: Record<string, unknown>
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = { ...row, edicao_utilizada: true, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('avaliacoes_diarias').update(payload).eq('id', id);
  if (!error) return { error: null };

  const msg = error.message.toLowerCase();
  if (msg.includes('edicao_utilizada') && msg.includes('does not exist')) {
    const { edicao_utilizada: _e, ...semEdicao } = payload;
    const retry = await supabase.from('avaliacoes_diarias').update(semEdicao).eq('id', id);
    return { error: retry.error?.message ?? null };
  }
  if (faltaColunaJustificativa(error.message)) {
    const { justificativa_nota_baixa: _j, ...semJust } = payload;
    const retry = await supabase.from('avaliacoes_diarias').update(semJust).eq('id', id);
    if (!retry.error) return { error: null };
    if (faltaColunaEdicao(retry.error.message)) {
      const { edicao_utilizada: _e, ...minimo } = semJust;
      const retry2 = await supabase.from('avaliacoes_diarias').update(minimo).eq('id', id);
      return { error: retry2.error?.message ?? null };
    }
    return { error: retry.error.message };
  }
  return { error: error.message };
}
