import { canResponderAjudaPorId, normalizePortalRole } from '@/lib/roles';

/** Visão de todos os colaboradores (só sócio, admin ou responsável ajuda dedicado). */
export function podeVerGraosGestaoTodos(
  role: string | null | undefined,
  colaboradorId?: string | null
): boolean {
  const r = normalizePortalRole(role);
  if (r === 'socio' || r === 'admin') return true;
  if (canResponderAjudaPorId(colaboradorId)) return true;
  return false;
}
