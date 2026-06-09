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
  if (!dataNascimento) return false;
  const iso = dataNascimento.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const mesNasc = Number(m[2]);
  const diaNasc = Number(m[3]);
  if (!mesNasc || !diaNasc) return false;
  const { dia, mes } = diaMesCivilBr(ref);
  return diaNasc === dia && mesNasc === mes;
}
