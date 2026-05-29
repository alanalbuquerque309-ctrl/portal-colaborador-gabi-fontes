import { normalizePortalRole } from '@/lib/roles';

/** Fechamento de gorjeta: apenas sócios e administrador (Daniel). */
export function podeVerBonificacaoInterna(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}
