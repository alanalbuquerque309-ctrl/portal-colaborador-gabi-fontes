import { normalizePortalRole, getAjudaResponsavelColaboradorId, canResponderAjudaPorId } from '@/lib/roles';

/** RH, sócios, admin, gerentes/masters e Daniel (UUID dedicado) veem alertas do termômetro. */
export function canVisualizarAlertasEmocional(
  role: string | null | undefined,
  colaboradorId?: string | null
): boolean {
  const r = normalizePortalRole(role);
  if (r === 'socio' || r === 'admin' || r === 'rh' || r === 'gerente' || r === 'master') return true;
  if (canResponderAjudaPorId(colaboradorId ?? null)) return true;
  const expected = getAjudaResponsavelColaboradorId();
  if (expected && colaboradorId && String(colaboradorId).trim() === expected) return true;
  return false;
}

/** Sócio/admin/RH/Daniel: rede inteira. Gerente/master: filtrar pela própria unidade na API. */
export function alertasEmocionalEscopoRede(
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
