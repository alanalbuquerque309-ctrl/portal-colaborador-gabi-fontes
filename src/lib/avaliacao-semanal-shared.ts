import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';

export function assiduidadeParaBanco(
  s: AssiduidadeTipo
): 'presente' | 'falta_justificada' | 'falta_injustificada' {
  if (s === 'folga' || s === 'outra_escala') return 'falta_justificada';
  return s;
}

export function isDateIsoAvaliacao(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
