function normalizarNome(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Compara nomes de cadastro com padrões parciais (ex.: «Gabriela» ↔ «Gabriela Fontes»). */
export function nomeCoincide(cadastro: string, busca: string): boolean {
  const a = normalizarNome(cadastro);
  const b = normalizarNome(busca);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const partesB = b.split(/\s+/).filter((p) => p.length > 2);
  if (partesB.length >= 2) {
    return partesB.every((p) => a.includes(p));
  }
  return false;
}
