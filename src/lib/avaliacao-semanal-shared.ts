import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';

/** Marcador gravado em justificativa_nota_baixa (assiduidade no banco = falta_justificada). */
export const JUSTIFICATIVA_FORA_PLANTAO =
  'Fora do plantão deste líder (outro líder avalia nesta semana).';

export function assiduidadeParaBanco(
  s: AssiduidadeTipo
): 'presente' | 'falta_justificada' | 'falta_injustificada' {
  if (s === 'folga' || s === 'outra_escala' || s === 'fora_plantao') return 'falta_justificada';
  return s;
}

/** Reconstrói o tipo da UI a partir do que está no Postgres. */
export function assiduidadeDoBanco(
  stored: string | null | undefined,
  justificativa?: string | null
): AssiduidadeTipo {
  const s = String(stored ?? '').trim();
  const j = String(justificativa ?? '').trim();
  if (s === 'falta_justificada' && j === JUSTIFICATIVA_FORA_PLANTAO) return 'fora_plantao';
  if (s === 'presente' || s === 'falta_injustificada' || s === 'falta_justificada') return s;
  return 'presente';
}

export function ehForaPlantaoAvaliacao(
  stored: string | null | undefined,
  justificativa?: string | null
): boolean {
  return assiduidadeDoBanco(stored, justificativa) === 'fora_plantao';
}

export function isDateIsoAvaliacao(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
