import { normalizePortalRole } from '@/lib/roles';

/** Vê e trata sugestões/reclamações de terceiros (admin, RH, sócios). */
export function podeGerirSugestoesReclamacoes(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'rh';
}
