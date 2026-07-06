import { partesSaoPaulo } from '@/lib/semana-brasil';

const MAPA: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** 1=segunda … 7=domingo em America/Sao_Paulo. */
export function diaSemanaOperacionalSaoPaulo(ref: Date = new Date()): number {
  const { wd } = partesSaoPaulo(ref);
  const key = wd.slice(0, 3);
  return MAPA[key] ?? 1;
}

export function rotuloDiaSemana(dia: number): string {
  const labels = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return labels[dia] ?? `Dia ${dia}`;
}

export function rotuloTurno(turno: 'manha' | 'tarde'): string {
  return turno === 'manha' ? 'Manhã' : 'Tarde';
}
