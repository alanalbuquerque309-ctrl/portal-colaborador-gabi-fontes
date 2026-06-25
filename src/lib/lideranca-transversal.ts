import { normalizePortalRole } from '@/lib/roles';

function normalizarTexto(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Administrador da empresa (ex.: Daniel): role admin ou cargo com «administrador». */
export function isLiderAdministradorTransversal(
  role: string | null | undefined,
  cargo: string | null | undefined
): boolean {
  if (normalizePortalRole(role) === 'admin') return true;
  const c = normalizarTexto(cargo);
  return c.includes('administrador') || c.includes('adminisrtador');
}

/** Quando true, lista de equipe usa só `lideres_por_setor` (sem fallback por nome). Rollback: LIDERANCA_SO_BANCO=false */
export function liderancaResolveSoBanco(): boolean {
  const raw = String(process.env.LIDERANCA_SO_BANCO ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0';
}
