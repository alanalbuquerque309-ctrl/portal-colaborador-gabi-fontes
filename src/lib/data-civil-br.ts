/** Data civil no fuso America/Sao_Paulo (YYYY-MM-DD). */
export function dataCivilBr(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

/** Dia e mês (1–12) no fuso BR para comparar com data_nascimento. */
export function diaMesCivilBr(date = new Date()): { dia: number; mes: number } {
  const iso = dataCivilBr(date);
  const [, mesStr, diaStr] = iso.split('-');
  return { dia: Number(diaStr), mes: Number(mesStr) };
}

export function aniversarioNoDia(dataNascimento: string | null, ref = new Date()): boolean {
  const partes = partesDataIso(dataNascimento);
  if (!partes) return false;
  const { dia, mes } = diaMesCivilBr(ref);
  return partes.dia === dia && partes.mes === mes;
}

/** Partes Y-M-D sem passar por `Date` (evita troca de dia/mês por UTC). */
export function partesDataIso(iso: string | null | undefined): { ano: number; mes: number; dia: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (!ano || !mes || !dia) return null;
  return { ano, mes, dia };
}

/** Aniversário cai no mês civil BR de `ref` (lista do mural). */
export function aniversarioNoMes(dataNascimento: string | null, ref = new Date()): boolean {
  const partes = partesDataIso(dataNascimento);
  if (!partes) return false;
  const { mes } = diaMesCivilBr(ref);
  return partes.mes === mes;
}

const MESES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Ex.: "15 de junho" — só dia e mês, sem deslocamento de fuso. */
export function formatarDiaMesAniversarioPtBr(dataNascimento: string | null | undefined): string {
  const p = partesDataIso(dataNascimento);
  if (!p) return '';
  const nomeMes = MESES_PT[p.mes - 1] ?? String(p.mes);
  return `${p.dia} de ${nomeMes}`;
}
