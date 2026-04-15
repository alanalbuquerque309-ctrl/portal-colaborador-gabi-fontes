/** Senha numérica de 6 dígitos (portal colaborador). */
export const SENHA_PADRAO_INICIAL = '123456';

export function senhaNumerica6Valida(s: string): boolean {
  return /^\d{6}$/.test(s.trim());
}
