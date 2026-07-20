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

/** Data civil YYYY-MM-DD em America/Sao_Paulo. */
export function dataOperacionalSaoPaulo(ref: Date = new Date()): string {
  return partesSaoPaulo(ref).iso;
}

/** Quantos dias de checklist ficam guardados para conferência (janela rolante). */
export const CHECKLIST_RETENCAO_DIAS = 7;

/** Data mínima inclusiva da janela (hoje − 6 dias = 7 dias no total). */
export function dataMinimaRetencaoChecklist(ref: Date = new Date()): string {
  const hoje = dataOperacionalSaoPaulo(ref);
  const [y, m, d] = hoje.split('-').map((x) => parseInt(x, 10));
  const local = new Date(y, (m || 1) - 1, d || 1);
  local.setDate(local.getDate() - (CHECKLIST_RETENCAO_DIAS - 1));
  const ys = local.getFullYear();
  const ms = String(local.getMonth() + 1).padStart(2, '0');
  const ds = String(local.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

export function diaSemanaDeDataIso(dataIso: string): number {
  const [y, m, d] = String(dataIso).split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return diaSemanaOperacionalSaoPaulo();
  const local = new Date(y, m - 1, d);
  const dow = local.getDay(); // 0=dom … 6=sáb
  return dow === 0 ? 7 : dow;
}

export function rotuloDiaSemana(dia: number): string {
  const labels = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return labels[dia] ?? `Dia ${dia}`;
}

export function rotuloDataChecklist(dataIso: string): string {
  const dia = diaSemanaDeDataIso(dataIso);
  const [y, m, d] = String(dataIso).split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return rotuloDiaSemana(dia);
  const dt = new Date(y, m - 1, d);
  const dataCurta = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${rotuloDiaSemana(dia)} ${dataCurta}`;
}

export function rotuloTurno(turno: 'manha' | 'tarde'): string {
  return turno === 'manha' ? 'Manhã' : 'Tarde';
}
