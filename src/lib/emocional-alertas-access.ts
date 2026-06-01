import { normalizePortalRole, getAjudaResponsavelColaboradorId, canResponderAjudaPorId } from '@/lib/roles';

/** RH, sócios, admin e Daniel (UUID dedicado) veem alertas do termômetro. */
export function canVisualizarAlertasEmocional(
  role: string | null | undefined,
  colaboradorId?: string | null
): boolean {
  const r = normalizePortalRole(role);
  if (r === 'socio' || r === 'admin' || r === 'rh') return true;
  if (canResponderAjudaPorId(colaboradorId ?? null)) return true;
  const expected = getAjudaResponsavelColaboradorId();
  if (expected && colaboradorId && String(colaboradorId).trim() === expected) return true;
  return false;
}
