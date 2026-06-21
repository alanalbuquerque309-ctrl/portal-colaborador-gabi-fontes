export const CAFE_CONECTA_REACOES = [
  { id: 'gostei', emoji: '👍', label: 'Gostei da iniciativa' },
  { id: 'muito_legal', emoji: '☕', label: 'Muito legal' },
  { id: 'aproxima', emoji: '👏', label: 'Aproxima as equipes' },
  { id: 'continuar', emoji: '❤️', label: 'Quero continuar participando' },
] as const;

export type CafeConectaReacaoId = (typeof CAFE_CONECTA_REACOES)[number]['id'];

const IDS = new Set<string>(CAFE_CONECTA_REACOES.map((r) => r.id));

export function isReacaoCafeConectaValida(id: string | null | undefined): id is CafeConectaReacaoId {
  return IDS.has(String(id ?? '').trim());
}

export function metaReacaoCafeConecta(id: string): (typeof CAFE_CONECTA_REACOES)[number] | null {
  return CAFE_CONECTA_REACOES.find((r) => r.id === id) ?? null;
}
