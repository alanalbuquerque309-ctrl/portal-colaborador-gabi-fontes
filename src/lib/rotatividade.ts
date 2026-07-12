/** Limites de mês civil (YYYY-MM-DD) em calendário local do servidor. */
export function limitesMesCivil(ano: number, mes: number): { inicio: string; fim: string; rotulo: string } {
  const m = Math.min(12, Math.max(1, Math.floor(mes)));
  const y = Math.floor(ano);
  const ultimoDia = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  const dd = String(ultimoDia).padStart(2, '0');
  const inicio = `${y}-${mm}-01`;
  const fim = `${y}-${mm}-${dd}`;
  const rotulo = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { inicio, fim, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
}

/** Mês atual (calendário local). */
export function mesCivilAtual(): { ano: number; mes: number } {
  const agora = new Date();
  return { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
}

export function isoEmIntervalo(iso: string | null | undefined, inicio: string, fim: string): boolean {
  const d = String(iso ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d >= inicio && d <= fim;
}
