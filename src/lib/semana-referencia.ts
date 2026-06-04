/**
 * Semana civil: segunda a domingo, fuso horário local do navegador/servidor.
 * `data_referencia` em `avaliacoes_diarias` guarda sempre a segunda-feira da semana.
 */

export { isDateIsoAvaliacao } from '@/lib/avaliacao-semanal-shared';

export function parseDataLocalISO(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function formatarDataLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Segunda-feira da semana que contém `dataIso` (YYYY-MM-DD). */
export function inicioSemanaSegundaFeiraLocal(dataIso: string): string {
  const d = parseDataLocalISO(dataIso);
  if (Number.isNaN(d.getTime())) return dataIso;
  const dow = d.getDay();
  const diffParaSegunda = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffParaSegunda);
  return formatarDataLocalISO(d);
}

export function fimSemanaDomingoLocal(inicioSegundaIso: string): string {
  const d = parseDataLocalISO(inicioSegundaIso);
  if (Number.isNaN(d.getTime())) return inicioSegundaIso;
  d.setDate(d.getDate() + 6);
  return formatarDataLocalISO(d);
}

/** Hoje (local) → segunda da semana atual. */
export function hojeInicioSemanaISO(): string {
  return inicioSemanaSegundaFeiraLocal(formatarDataLocalISO(new Date()));
}

/** Segunda-feira da semana anterior (operacional: avaliar a semana que acabou no domingo). */
export function semanaAnteriorInicioISO(ref: Date = new Date()): string {
  const segAtual = parseDataLocalISO(inicioSemanaSegundaFeiraLocal(formatarDataLocalISO(ref)));
  if (Number.isNaN(segAtual.getTime())) return hojeInicioSemanaISO();
  segAtual.setDate(segAtual.getDate() - 7);
  return formatarDataLocalISO(segAtual);
}

/** Semana que a liderança deve avaliar por defeito (semana civil anterior). */
export function semanaAvaliacaoEquipePadraoISO(): string {
  return semanaAnteriorInicioISO();
}

/** Texto curto para lembretes na home e telas de liderança. */
export function lembreteAvaliacaoSemanaPassada(): { intervalo: string; titulo: string; detalhe: string } {
  const intervalo = formatarIntervaloSemanaPtBR(semanaAvaliacaoEquipePadraoISO());
  return {
    intervalo,
    titulo: 'Avalie sua equipe da semana passada',
    detalhe: `Semana ${intervalo} (segunda a domingo que já terminou). Quem não estava no seu plantão nessa semana: marque no card, não dê nota.`,
  };
}

export function formatarIntervaloSemanaPtBR(inicioSegundaIso: string): string {
  const ini = parseDataLocalISO(inicioSegundaIso);
  const fim = parseDataLocalISO(fimSemanaDomingoLocal(inicioSegundaIso));
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime())) return inicioSegundaIso;
  const a = ini.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const b = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${a} a ${b}`;
}
