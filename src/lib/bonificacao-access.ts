import { normalizePortalRole } from '@/lib/roles';

/** Fechamento de gorjeta: apenas sócios e administrador (Daniel). */
export function podeVerBonificacaoInterna(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}

/** Reclamações no portal: só sócios e administrador (Daniel). */
export function podeEnviarReclamacaoPortal(role: string | null | undefined): boolean {
  return podeVerBonificacaoInterna(role);
}
