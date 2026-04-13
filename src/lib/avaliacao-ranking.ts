/** Mínimo de dias com média numérica no mês para entrar no ranking. */
export const AVALIACAO_RANKING_MIN_DIAS = 5;

export type ScoreMensal = { id: string; nome: string; media: number; dias: number };

/**
 * Top 3 por média; se empate no 3.º lugar, inclui mais 1 pessoa (máx. 4).
 */
export function topTresComEmpateNoTerceiro(scored: ScoreMensal[]): { id: string; nome: string; media: number }[] {
  const eligible = scored.filter((s) => s.dias >= AVALIACAO_RANKING_MIN_DIAS);
  eligible.sort((a, b) => b.media - a.media || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (eligible.length === 0) return [];
  const out = eligible.slice(0, 3);
  if (eligible.length > 3 && eligible[2].media === eligible[3].media) {
    out.push(eligible[3]);
  }
  return out.map(({ id, nome, media }) => ({ id, nome, media: Math.round(media * 100) / 100 }));
}

export function mediaMensalColaborador(
  linhas: { media_dia: number | null }[]
): { media: number | null; dias: number } {
  const vals = linhas.map((l) => l.media_dia).filter((m): m is number => m !== null && !Number.isNaN(m));
  if (vals.length === 0) return { media: null, dias: 0 };
  const soma = vals.reduce((a, b) => a + b, 0);
  return { media: Math.round((soma / vals.length) * 100) / 100, dias: vals.length };
}
