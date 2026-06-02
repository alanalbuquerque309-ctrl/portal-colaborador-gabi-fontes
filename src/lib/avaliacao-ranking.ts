import {
  consolidarNotasSemanaisParaRanking,
  type AvaliacaoSemanaConsolidavel,
} from '@/lib/avaliacao-semanal-agregacao';
import type { ContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';

/**
 * Segunda-feira (`data_referencia`) da primeira semana oficial no mural/ranking.
 * Semanas anteriores não entram em médias nem em contagem de semanas avaliadas.
 */
export const AVALIACAO_RANKING_EPOCA_INICIO = '2026-06-01';

/** Mínimo de semanas distintas no mês para entrar no ranking mensal (top 3). */
export const AVALIACAO_RANKING_MIN_SEMANAS = 1;

export type AvaliacaoSemanaLinha = {
  data_referencia: string;
  media_dia: number | null;
  created_at?: string | null;
  avaliador_id?: string | null;
  avaliador_role?: string | null;
};

/** Limite inferior efetivo: não antes da época oficial nem antes do início do mês consultado. */
export function inicioDataReferenciaRanking(periodoIni: string): string {
  return periodoIni >= AVALIACAO_RANKING_EPOCA_INICIO
    ? periodoIni
    : AVALIACAO_RANKING_EPOCA_INICIO;
}

export function agruparMediasPorColaborador(
  linhas: Array<AvaliacaoSemanaLinha & { colaborador_id: string }>,
  colaboradorIds: string[],
  periodoIni: string,
  ctx: ContextoConsolidacaoRanking
): Record<string, { media_dia: number | null }[]> {
  const desde = inicioDataReferenciaRanking(periodoIni);
  const raw: Record<string, AvaliacaoSemanaConsolidavel[]> = {};
  for (const id of colaboradorIds) raw[id] = [];
  for (const row of linhas) {
    const cid = String(row.colaborador_id);
    if (!raw[cid]) continue;
    const aid = String(row.avaliador_id ?? '');
    raw[cid].push({
      ...row,
      avaliador_role:
        row.avaliador_role ?? ctx.rolePorAvaliador.get(aid) ?? null,
    });
  }
  const out: Record<string, { media_dia: number | null }[]> = {};
  for (const id of colaboradorIds) {
    const liderIds = ctx.liderIdsPorColaborador[id] ?? new Set<string>();
    out[id] = consolidarNotasSemanaisParaRanking(raw[id] ?? [], {
      liderIds,
      rhIds: ctx.rhIds,
      desde,
    });
  }
  return out;
}

/** Mínimo para destaque semanal no mural (1 avaliação na semana já conta). */
export const AVALIACAO_RANKING_MIN_SEMANAS_SEMANAL = 1;

/** @deprecated Use `AVALIACAO_RANKING_MIN_SEMANAS` (avaliações passaram a ser semanais). */
export const AVALIACAO_RANKING_MIN_DIAS = AVALIACAO_RANKING_MIN_SEMANAS;

export type ScoreMensal = { id: string; nome: string; media: number; dias: number };

/**
 * Top 3 por média; se empate no 3.º lugar, inclui mais 1 pessoa (máx. 4).
 */
export function topTresComEmpateNoTerceiro(scored: ScoreMensal[]): { id: string; nome: string; media: number }[] {
  const eligible = scored.filter((s) => s.dias >= AVALIACAO_RANKING_MIN_SEMANAS);
  eligible.sort((a, b) => b.media - a.media || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (eligible.length === 0) return [];
  const out = eligible.slice(0, 3);
  if (eligible.length > 3 && eligible[2].media === eligible[3].media) {
    out.push(eligible[3]);
  }
  return out.map(({ id, nome, media }) => ({ id, nome, media: Math.round(media * 100) / 100 }));
}

/** `dias` no retorno é o número de registros no mês (uma avaliação por semana). */
export function mediaMensalColaborador(
  linhas: { media_dia: number | null }[]
): { media: number | null; dias: number } {
  const vals = linhas.map((l) => l.media_dia).filter((m): m is number => m !== null && !Number.isNaN(m));
  if (vals.length === 0) return { media: null, dias: 0 };
  const soma = vals.reduce((a, b) => a + b, 0);
  return { media: Math.round((soma / vals.length) * 100) / 100, dias: vals.length };
}
