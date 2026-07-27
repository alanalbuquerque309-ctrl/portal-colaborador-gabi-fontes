import type { createAdminClient } from '@/lib/supabase/admin';
import { avaliacaoEstaIgnorada } from '@/lib/avaliacao-ignorada';
import { assiduidadeLegacySemanalRemovida } from '@/lib/avaliacao-diaria';
import { isAvaliacaoDeVisitaRh } from '@/lib/avaliacao-rh-visita-access';
import { assiduidadeDoBanco, ehLicencaOuAfastamentoAvaliacao } from '@/lib/avaliacao-semanal-shared';
import type { AvaliacaoDiariaLeitura } from '@/lib/avaliacoes-justificativa-compat';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type AvaliacaoFechamentoRow = {
  id?: string;
  colaborador_id: string;
  avaliador_id: string;
  assiduidade: string | null;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
  data_retorno_previsto?: string | null;
  ignorada?: boolean | null;
  avaliador_role?: string | null;
  updated_at?: string | null;
  edicao_utilizada?: boolean;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  nota_proatividade?: number | null;
};

/** Avaliação de líder (não RH) que fecha a semana do colaborador. */
export function avaliacaoFechaSemanaLider(row: AvaliacaoFechamentoRow, rhIds: Set<string>): boolean {
  if (avaliacaoEstaIgnorada(row)) return false;
  if (isAvaliacaoDeVisitaRh(row.avaliador_id, row.avaliador_role, rhIds)) return false;
  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
  if (a === 'fora_plantao') return false;
  if (assiduidadeLegacySemanalRemovida(a)) return false;
  if (a === 'ferias') return true;
  if (ehLicencaOuAfastamentoAvaliacao(row.assiduidade, row.justificativa_nota_baixa)) return true;
  if (a === 'falta_injustificada') return true;
  return row.media_dia != null && !Number.isNaN(Number(row.media_dia));
}

function escolherMelhorFechamento(rows: AvaliacaoFechamentoRow[], rhIds: Set<string>): AvaliacaoFechamentoRow | null {
  const validas = rows.filter((r) => avaliacaoFechaSemanaLider(r, rhIds));
  if (validas.length === 0) return null;
  validas.sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  return validas[0] ?? null;
}

/** Colaborador já tem semana fechada por algum líder (exceto visita RH). */
export function colaboradorFechouSemanaPorAlgumLider(
  rows: AvaliacaoFechamentoRow[],
  rhIds: Set<string>
): boolean {
  return escolherMelhorFechamento(rows, rhIds) != null;
}

/** Fechamento por outro líder (não o `avaliadorAtualId`). */
export function colaboradorFechouSemanaPorOutroLider(
  rows: AvaliacaoFechamentoRow[],
  rhIds: Set<string>,
  avaliadorAtualId: string
): boolean {
  const fechamento = escolherMelhorFechamento(rows, rhIds);
  return fechamento != null && String(fechamento.avaliador_id) !== String(avaliadorAtualId);
}

function linhaParaLeitura(row: AvaliacaoFechamentoRow): AvaliacaoDiariaLeitura & {
  avaliador_id?: string;
  data_retorno_previsto?: string | null;
} {
  return {
    id: row.id,
    colaborador_id: row.colaborador_id,
    assiduidade: assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa) as AvaliacaoDiariaLeitura['assiduidade'],
    nota_vestimenta: row.nota_vestimenta ?? null,
    nota_pontualidade: row.nota_pontualidade ?? null,
    nota_trabalho_equipe: row.nota_trabalho_equipe ?? null,
    nota_desempenho_tarefas: row.nota_desempenho_tarefas ?? null,
    nota_proatividade: row.nota_proatividade ?? null,
    media_dia: row.media_dia,
    justificativa_nota_baixa: row.justificativa_nota_baixa ?? null,
    edicao_utilizada: row.edicao_utilizada === true,
    avaliador_id: row.avaliador_id,
    data_retorno_previsto: row.data_retorno_previsto ?? null,
  };
}

/**
 * Só a avaliação do líder logado.
 * Co-líderes (ex.: Sabrina e Henrique na Fábrica de doces) avaliam em paralelo;
 * um basta para Grãos, mas o outro continua podendo enviar a própria.
 */
export function resolverAvaliacaoExibicaoLider(opts: {
  rows: AvaliacaoFechamentoRow[];
  avaliadorAtualId: string;
  rhIds: Set<string>;
}): AvaliacaoDiariaLeitura | null {
  const doAtual = opts.rows.filter(
    (r) => String(r.avaliador_id) === String(opts.avaliadorAtualId) && !avaliacaoEstaIgnorada(r)
  );
  if (doAtual.length === 0) return null;
  doAtual.sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  return linhaParaLeitura(doAtual[0]!);
}

/** Outro líder já fechou a semana (só aviso; não bloqueia o formulário). */
export function colegaLiderJaFechouSemana(
  rows: AvaliacaoFechamentoRow[],
  rhIds: Set<string>,
  avaliadorAtualId: string
): boolean {
  return colaboradorFechouSemanaPorOutroLider(rows, rhIds, avaliadorAtualId);
}

export async function carregarAvaliacoesFechamentoColaboradores(
  supabase: SupabaseAdmin,
  dataReferencias: string[],
  colaboradorIds: string[]
): Promise<{ rows: AvaliacaoFechamentoRow[]; error: string | null }> {
  if (colaboradorIds.length === 0 || dataReferencias.length === 0) {
    return { rows: [], error: null };
  }

  const semanas = Array.from(new Set(dataReferencias));
  const selectFull =
    'id, colaborador_id, avaliador_id, assiduidade, media_dia, justificativa_nota_baixa, data_retorno_previsto, edicao_utilizada, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, ignorada, updated_at';
  const selectBase =
    'id, colaborador_id, avaliador_id, assiduidade, media_dia, justificativa_nota_baixa, edicao_utilizada, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, updated_at';

  const resFull = await supabase
    .from('avaliacoes_diarias')
    .select(selectFull)
    .in('data_referencia', semanas)
    .in('colaborador_id', colaboradorIds);

  let raw: Record<string, unknown>[] | null = null;
  let queryError: string | null = null;

  if (!resFull.error) {
    raw = (resFull.data ?? []) as Record<string, unknown>[];
  } else if (/data_retorno_previsto|nota_proatividade|ignorada|does not exist|schema cache/i.test(resFull.error.message)) {
    const resBase = await supabase
      .from('avaliacoes_diarias')
      .select(selectBase)
      .in('data_referencia', semanas)
      .in('colaborador_id', colaboradorIds);
    if (resBase.error) queryError = resBase.error.message;
    else raw = (resBase.data ?? []) as Record<string, unknown>[];
  } else {
    queryError = resFull.error.message;
  }

  if (queryError) return { rows: [], error: queryError };

  const dados = raw ?? [];
  const avaliadorIds = Array.from(new Set(dados.map((r) => String(r.avaliador_id ?? '')).filter(Boolean)));
  const rolesPorId = new Map<string, string>();
  if (avaliadorIds.length > 0) {
    const { data: avs } = await supabase.from('colaboradores').select('id, role').in('id', avaliadorIds);
    for (const a of avs ?? []) {
      rolesPorId.set(String(a.id), String((a as { role?: string }).role ?? ''));
    }
  }

  const rows = dados.map((r) => ({
    id: r.id != null ? String(r.id) : undefined,
    colaborador_id: String(r.colaborador_id),
    avaliador_id: String(r.avaliador_id),
    assiduidade: (r.assiduidade as string | null) ?? null,
    media_dia: r.media_dia != null ? Number(r.media_dia) : null,
    justificativa_nota_baixa: (r.justificativa_nota_baixa as string | null) ?? null,
    data_retorno_previsto:
      r.data_retorno_previsto != null ? String(r.data_retorno_previsto).slice(0, 10) : null,
    edicao_utilizada: r.edicao_utilizada === true,
    nota_vestimenta: r.nota_vestimenta != null ? Number(r.nota_vestimenta) : null,
    nota_pontualidade: r.nota_pontualidade != null ? Number(r.nota_pontualidade) : null,
    nota_trabalho_equipe: r.nota_trabalho_equipe != null ? Number(r.nota_trabalho_equipe) : null,
    nota_desempenho_tarefas: r.nota_desempenho_tarefas != null ? Number(r.nota_desempenho_tarefas) : null,
    nota_proatividade: r.nota_proatividade != null ? Number(r.nota_proatividade) : null,
    ignorada: r.ignorada as boolean | null | undefined,
    updated_at: r.updated_at != null ? String(r.updated_at) : null,
    avaliador_role: rolesPorId.get(String(r.avaliador_id)) ?? null,
  }));

  return { rows, error: null };
}

export function agruparAvaliacoesPorColaborador<T extends { colaborador_id: string }>(
  rows: T[]
): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const row of rows) {
    const cid = String(row.colaborador_id);
    const arr = mapa.get(cid) ?? [];
    arr.push(row);
    mapa.set(cid, arr);
  }
  return mapa;
}
