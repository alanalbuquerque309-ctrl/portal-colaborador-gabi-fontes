export type CanonicalPortalRole =
  | 'colaborador'
  | 'admin'
  | 'socio'
  | 'gerente'
  | 'master'
  | 'rh';

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza aliases legados de função para um papel canônico do portal.
 * Exemplos:
 * - "administrador" -> "admin"
 * - "sócio" -> "socio"
 * - "chefe" / "chefia" -> "gerente"
 */
export function normalizePortalRole(role: string | null | undefined): string {
  const raw = normalizeText(String(role ?? ''));
  if (!raw) return 'colaborador';

  if (
    raw === 'admin' ||
    raw === 'administrador' ||
    raw === 'administradora' ||
    raw === 'administrativo' ||
    raw === 'administracao'
  ) {
    return 'admin';
  }
  if (raw === 'socio' || raw === 'socio(a)') return 'socio';
  if (
    raw === 'gerente' ||
    raw === 'chefe' ||
    raw === 'chefes' ||
    raw === 'chefia' ||
    raw === 'lider' ||
    raw === 'lideranca'
  ) {
    return 'gerente';
  }
  if (raw === 'master') return 'master';
  if (raw === 'rh') return 'rh';
  if (raw === 'colaborador') return 'colaborador';
  return raw;
}

export function canResponderAjuda(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'admin' || r === 'rh';
}

export function canVisualizarAjuda(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'admin' || r === 'rh' || r === 'socio';
}

