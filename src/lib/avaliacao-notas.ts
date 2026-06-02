/** Escala de critérios da avaliação da equipe (e visita RH no mesmo formulário). */

export const NOTA_CRITERIO_MIN = 1;
export const NOTA_CRITERIO_MAX = 5;
export const NOTA_CRITERIO_PASSO = 0.5;

export function normalizarNotaCriterio(n: number): number {
  return Math.round(n * 2) / 2;
}

export function notaCriterioValida(n: unknown): n is number {
  if (typeof n !== 'number' || Number.isNaN(n)) return false;
  const x = normalizarNotaCriterio(n);
  if (x < NOTA_CRITERIO_MIN || x > NOTA_CRITERIO_MAX) return false;
  return Math.abs(x * 2 - Math.round(x * 2)) < 0.001;
}

export function formatarNotaCriterioPt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const x = normalizarNotaCriterio(Number(n));
  return Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ',');
}

export const LEGENDA_NOTA_CRITERIO: { ate: number; texto: string }[] = [
  { ate: 1.5, texto: 'Inaceitável' },
  { ate: 2.5, texto: 'Insuficiente' },
  { ate: 3.5, texto: 'Satisfatório (básico)' },
  { ate: 4.5, texto: 'Bom / detalhes a melhorar' },
  { ate: 5, texto: 'Impecável' },
];

export function legendaNotaCriterio(n: number): string {
  const x = normalizarNotaCriterio(n);
  for (const faixa of LEGENDA_NOTA_CRITERIO) {
    if (x <= faixa.ate) return faixa.texto;
  }
  return LEGENDA_NOTA_CRITERIO[LEGENDA_NOTA_CRITERIO.length - 1].texto;
}

export const CRITERIOS_AVALIACAO_EQUIPE = [
  { key: 'vestimenta' as const, label: 'Vestimenta' },
  { key: 'pontualidade' as const, label: 'Pontualidade' },
  { key: 'trabalhoEquipe' as const, label: 'Trabalho em equipe' },
  { key: 'desempenhoTarefas' as const, label: 'Desempenho de tarefas' },
  { key: 'proatividade' as const, label: 'Proatividade e iniciativa' },
];

/** Texto curto para orientar o gerente ao avaliar o 5º critério. */
export const DICA_CRITERIO_PROATIVIDADE =
  'Antecipa necessidades, resolve sem esperar ordem e ajuda o time sem ser pedido.';
