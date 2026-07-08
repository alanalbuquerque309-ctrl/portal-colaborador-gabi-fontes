import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';

/** Nota mínima (exclusive): abaixo de 3 = inelegível no Café Conecta. */
export const NOTA_MINIMA_CAFE_CONECTA = 3;

export type LinhaAvaliacaoCafeConecta = {
  assiduidade?: string | null;
  justificativa_nota_baixa?: string | null;
  ignorada?: boolean | null;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  nota_proatividade?: number | null;
};

function linhaAtivaParaCriteriosCafe(linha: LinhaAvaliacaoCafeConecta): boolean {
  if (linha.ignorada === true) return false;
  const a = assiduidadeDoBanco(linha.assiduidade, linha.justificativa_nota_baixa);
  return a === 'presente' || a === 'falta_justificada' || a === 'falta_injustificada';
}

function notasCriteriosLinha(linha: LinhaAvaliacaoCafeConecta): number[] {
  return [
    linha.nota_vestimenta,
    linha.nota_pontualidade,
    linha.nota_trabalho_equipe,
    linha.nota_desempenho_tarefas,
    linha.nota_proatividade,
  ]
    .filter((n): n is number => n != null && !Number.isNaN(Number(n)))
    .map((n) => Number(n));
}

/** Alguma nota de critério abaixo de 3 na avaliação ativa do líder nesta semana. */
export function colaboradorTemNotaAbaixoMinimoCafeConecta(linhas: LinhaAvaliacaoCafeConecta[]): boolean {
  for (const r of linhas) {
    if (!linhaAtivaParaCriteriosCafe(r)) continue;
    const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
    if (a === 'falta_injustificada') return true;
    const notas = notasCriteriosLinha(r);
    if (notas.some((n) => n < NOTA_MINIMA_CAFE_CONECTA)) return true;
  }
  return false;
}
