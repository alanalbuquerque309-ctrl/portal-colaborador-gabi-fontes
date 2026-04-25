/**
 * Normaliza telefone para login: só dígitos, sem 55 inicial, sem zeros à esquerda do DDD.
 * Deve espelhar `public._normalize_telefone_login_br` no banco.
 */
export function normalizeTelefoneLogin(input: string): string {
  let d = String(input ?? '').replace(/\D/g, '');
  d = d.replace(/^0+/, '');
  if (d.startsWith('55') && d.length >= 12) {
    d = d.slice(2);
  }
  return d;
}

export function telefoneLoginValido(n: string): boolean {
  return n.length >= 10 && n.length <= 11;
}

/** Ex.: (21) 99999-9999 — máscara para exibição no formulário de login */
export function formatTelefoneBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function syncTelefoneLoginFromTelefone(telefone: string | null | undefined): string | null {
  const n = normalizeTelefoneLogin(String(telefone ?? ''));
  return telefoneLoginValido(n) ? n : null;
}
