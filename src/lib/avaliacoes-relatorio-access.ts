/** Relatórios consolidados (equipe + liderança): sócio e administrativo. */
import { normalizePortalRole } from '@/lib/roles';

export function podeVerRelatoriosAvaliacoesCompletos(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}
