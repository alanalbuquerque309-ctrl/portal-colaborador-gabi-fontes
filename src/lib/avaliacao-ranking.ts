/** Mínimo de semanas (registros de avaliação da equipe) no mês para entrar no ranking. */
export const AVALIACAO_RANKING_MIN_SEMANAS = 2;

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
