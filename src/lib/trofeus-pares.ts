export const TROFEUS_PARES_CREDITOS_SEMANA = 3;

export const TROFEUS_PARES_TIPOS = ['postura', 'braco_direito', 'eficiencia'] as const;
export type TrofeuParTipo = (typeof TROFEUS_PARES_TIPOS)[number];

export const TROFEU_PAR_LABELS: Record<TrofeuParTipo, { titulo: string; emoji: string; descricao: string }> = {
  postura: {
    emoji: '⭐',
    titulo: 'Postura',
    descricao: 'Para quem manteve padrão, respeito e profissionalismo que a loja exige.',
  },
  braco_direito: {
    emoji: '🏆',
    titulo: 'Braço Direito',
    descricao: 'Para quem ajudou o time e segurou a operação quando precisou.',
  },
  eficiencia: {
    emoji: '⚡',
    titulo: 'Eficiência',
    descricao: 'Para quem resolveu um problema na hora, sem enrolar nem passar para outro.',
  },
};

/** Rótulos de tipos antigos (mural/histórico antes da migração 034). */
const TROFEU_PAR_LABELS_LEGADO: Record<string, { titulo: string; emoji: string }> = {
  energia_contagiante: { emoji: '✨', titulo: 'Energia Contagiante' },
  olhar_dono: { emoji: '👁️', titulo: 'Olhar de Dono' },
};

export function isTrofeuParTipo(v: string): v is TrofeuParTipo {
  return (TROFEUS_PARES_TIPOS as readonly string[]).includes(v);
}

export function metaTrofeuPar(tipo: string): { titulo: string; emoji: string; descricao?: string } | null {
  if (isTrofeuParTipo(tipo)) return TROFEU_PAR_LABELS[tipo];
  return TROFEU_PAR_LABELS_LEGADO[tipo] ?? null;
}
