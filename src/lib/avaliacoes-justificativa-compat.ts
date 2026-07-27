import type { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const CRIT =
  'id, colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas';

const SELECTS_LEITURA: string[] = [
  `${CRIT}, nota_proatividade, media_dia, justificativa_nota_baixa, edicao_utilizada`,
  `${CRIT}, nota_proatividade, media_dia, edicao_utilizada`,
  `${CRIT}, nota_proatividade, media_dia, justificativa_nota_baixa`,
  `${CRIT}, nota_proatividade, media_dia`,
  `${CRIT}, media_dia, justificativa_nota_baixa, edicao_utilizada`,
  `${CRIT}, media_dia, edicao_utilizada`,
  `${CRIT}, media_dia, justificativa_nota_baixa`,
  `${CRIT}, media_dia`,
];

export const SELECT_AVALIACAO_META =
  'id, data_referencia, assiduidade, media_dia, justificativa_nota_baixa, colaborador_id, avaliador_id, ignorada, ignorada_em, ignorada_motivo';

export const SELECT_AVALIACAO_META_SEM_IGNORAR =
  'id, data_referencia, assiduidade, media_dia, justificativa_nota_baixa, colaborador_id, avaliador_id';

const NOTAS =
  'nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas';

export const SELECT_AVALIACAO_RELATORIO_SEM_PROAT = `${SELECT_AVALIACAO_META}, ${NOTAS}`;
export const SELECT_AVALIACAO_RELATORIO_COM_PROAT = `${SELECT_AVALIACAO_RELATORIO_SEM_PROAT}, nota_proatividade`;

export const SELECT_AVALIACAO_ADMIN_RESUMO = SELECT_AVALIACAO_META;
export const SELECT_AVALIACAO_ADMIN_DETALHE = `${SELECT_AVALIACAO_META}, ${NOTAS}`;
export const SELECT_AVALIACAO_ADMIN_DETALHE_FULL = `${SELECT_AVALIACAO_ADMIN_DETALHE}, nota_proatividade`;
export const SELECT_AVALIACAO_ADMIN_DETALHE_SEM_IGNORAR = `${SELECT_AVALIACAO_META_SEM_IGNORAR}, ${NOTAS}`;
export const SELECT_AVALIACAO_ADMIN_DETALHE_FULL_SEM_IGNORAR =
  `${SELECT_AVALIACAO_ADMIN_DETALHE_SEM_IGNORAR}, nota_proatividade`;

const SELECTS_RELATORIO = [SELECT_AVALIACAO_RELATORIO_COM_PROAT, SELECT_AVALIACAO_RELATORIO_SEM_PROAT];
const SELECTS_ADMIN_DETALHE = [
  SELECT_AVALIACAO_ADMIN_DETALHE_FULL,
  SELECT_AVALIACAO_ADMIN_DETALHE_FULL_SEM_IGNORAR,
  SELECT_AVALIACAO_ADMIN_DETALHE,
  SELECT_AVALIACAO_ADMIN_DETALHE_SEM_IGNORAR,
];
const SELECTS_ADMIN_RESUMO = [SELECT_AVALIACAO_ADMIN_RESUMO, SELECT_AVALIACAO_META_SEM_IGNORAR];

function erroColunaAusente(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    /column.*nota_proatividade/i.test(m) ||
    /column.*edicao_utilizada/i.test(m) ||
    /column.*justificativa_nota_baixa/i.test(m) ||
    /column.*ignorada/i.test(m)
  );
}

function faltaColunaIgnorada(msg: string): boolean {
  const m = msg.toLowerCase();
  return (m.includes('ignorada') || m.includes('ignorada_em') || m.includes('ignorada_motivo')) && erroColunaAusente(msg);
}

function faltaColunaJustificativa(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('justificativa_nota_baixa') && erroColunaAusente(msg);
}

function faltaColunaEdicao(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('edicao_utilizada') && erroColunaAusente(msg);
}

function faltaColunaProatividade(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('nota_proatividade') && erroColunaAusente(msg);
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
  data_retorno_previsto?: string | null;
  edicao_utilizada?: boolean;
};

function normalizarLinhaLeitura(r: Record<string, unknown>): AvaliacaoDiariaLeitura {
  return {
    ...(r as AvaliacaoDiariaLeitura),
    nota_proatividade:
      r.nota_proatividade === undefined ? null : (r.nota_proatividade as number | null),
    edicao_utilizada: r.edicao_utilizada === true,
    justificativa_nota_baixa:
      r.justificativa_nota_baixa === undefined ? null : (r.justificativa_nota_baixa as string | null),
  };
}

async function queryAvaliacoesSemana(
  supabase: SupabaseAdmin,
  select: string,
  dataReferencia: string,
  colaboradorIds: string[],
  avaliadorId?: string | null
) {
  let q = supabase
    .from('avaliacoes_diarias')
    .select(select)
    .eq('data_referencia', dataReferencia)
    .in('colaborador_id', colaboradorIds);
  if (avaliadorId) q = q.eq('avaliador_id', avaliadorId);
  return q;
}

type SupabaseSelectResult = { data: unknown[] | null; error: { message: string } | null };

async function runSelectsEmOrdem(
  selects: string[],
  run: (select: string) => Promise<SupabaseSelectResult>
): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  let lastError: string | null = null;
  for (const select of selects) {
    const res = await run(select);
    if (!res.error) {
      return { data: (res.data ?? []) as Record<string, unknown>[], error: null };
    }
    lastError = res.error.message;
    if (!erroColunaAusente(res.error.message)) {
      return { data: [], error: res.error.message };
    }
  }
  return { data: [], error: lastError };
}

export async function queryAvaliacoesDiariasRelatorio(
  run: (select: string) => Promise<SupabaseSelectResult>
): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  return runSelectsEmOrdem(SELECTS_RELATORIO, run);
}

export async function queryAvaliacoesDiariasAdmin(
  incluirDetalhe: boolean,
  run: (select: string) => Promise<SupabaseSelectResult>
): Promise<{ data: Record<string, unknown>[]; error: string | null }> {
  const selects = incluirDetalhe ? SELECTS_ADMIN_DETALHE : SELECTS_ADMIN_RESUMO;
  return runSelectsEmOrdem(selects, run);
}

export async function selectAvaliacoesDiariasPorColaboradores(
  supabase: SupabaseAdmin,
  dataReferencia: string,
  colaboradorIds: string[],
  avaliadorId?: string | null
): Promise<{ rows: AvaliacaoDiariaLeitura[]; error: string | null }> {
  if (colaboradorIds.length === 0) return { rows: [], error: null };

  let lastError: string | null = null;
  for (const select of SELECTS_LEITURA) {
    const res = await queryAvaliacoesSemana(supabase, select, dataReferencia, colaboradorIds, avaliadorId);
    if (!res.error) {
      return {
        rows: (res.data ?? []).map((r) =>
          normalizarLinhaLeitura(r as unknown as Record<string, unknown>)
        ),
        error: null,
      };
    }
    lastError = res.error.message;
    if (!erroColunaAusente(res.error.message)) {
      return { rows: [], error: res.error.message };
    }
  }

  return { rows: [], error: lastError };
}

function faltaColunaDataRetorno(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('data_retorno_previsto') && erroColunaAusente(msg);
}

function stripColunasAusentesInsert(
  row: Record<string, unknown>,
  msg: string
): Record<string, unknown> | null {
  let next = { ...row };
  if (faltaColunaProatividade(msg)) {
    const { nota_proatividade: _p, ...rest } = next;
    next = rest;
    return next;
  }
  if (faltaColunaJustificativa(msg)) {
    const { justificativa_nota_baixa: _j, ...rest } = next;
    next = rest;
    return next;
  }
  if (faltaColunaEdicao(msg)) {
    const { edicao_utilizada: _e, ...rest } = next;
    next = rest;
    return next;
  }
  if (faltaColunaDataRetorno(msg)) {
    const { data_retorno_previsto: _r, ...rest } = next;
    next = rest;
    return next;
  }
  return null;
}

export async function insertAvaliacaoDiariaCompat(
  supabase: SupabaseAdmin,
  row: Record<string, unknown>
): Promise<{ error: string | null; proatividade_omitida?: boolean }> {
  let payload: Record<string, unknown> = { ...row };
  let proatividadeOmitida = false;
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from('avaliacoes_diarias').insert(payload);
    if (!error) return { error: null, proatividade_omitida: proatividadeOmitida };
    if (!erroColunaAusente(error.message)) return { error: error.message };
    const stripped = stripColunasAusentesInsert(payload, error.message);
    if (!stripped) return { error: error.message };
    if (faltaColunaProatividade(error.message) && payload.nota_proatividade != null) {
      proatividadeOmitida = true;
    }
    payload = stripped;
  }
  return { error: 'Não foi possível gravar a avaliação (schema desatualizado).' };
}

export async function updateAvaliacaoDiariaCompat(
  supabase: SupabaseAdmin,
  id: string,
  row: Record<string, unknown>
): Promise<{ error: string | null; proatividade_omitida?: boolean }> {
  let payload: Record<string, unknown> = { ...row, edicao_utilizada: true, updated_at: new Date().toISOString() };
  let proatividadeOmitida = false;
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from('avaliacoes_diarias').update(payload).eq('id', id);
    if (!error) return { error: null, proatividade_omitida: proatividadeOmitida };
    if (!erroColunaAusente(error.message)) return { error: error.message };
    const stripped = stripColunasAusentesInsert(payload, error.message);
    if (!stripped) return { error: error.message };
    if (faltaColunaProatividade(error.message) && payload.nota_proatividade != null) {
      proatividadeOmitida = true;
    }
    payload = stripped;
  }
  return { error: 'Não foi possível atualizar a avaliação (schema desatualizado).' };
}

export { faltaColunaJustificativa, faltaColunaEdicao, faltaColunaProatividade };
