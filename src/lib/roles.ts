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

/**
 * UUID do colaborador que responde o canal de ajuda (ex.: Daniel).
 * Definir na Vercel: `NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID`.
 */
export function getAjudaResponsavelColaboradorId(): string {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID || '').trim();
  }
  return (
    process.env.AJUDA_RESPONSAVEL_COLABORADOR_ID ||
    process.env.NEXT_PUBLIC_AJUDA_RESPONSAVEL_COLABORADOR_ID ||
    ''
  ).trim();
}

export function temResponsavelAjudaDedicado(): boolean {
  return !!getAjudaResponsavelColaboradorId();
}

export function canResponderAjudaPorId(colaboradorId: string | null | undefined): boolean {
  const expected = getAjudaResponsavelColaboradorId();
  if (!expected || !colaboradorId) return false;
  return String(colaboradorId).trim() === expected;
}

/** Legado: admin/RH respondiam antes do UUID dedicado. */
export function canResponderAjudaLegacy(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'admin' || r === 'rh';
}

/**
 * Quem pode responder no inbox ajuda.
 * Com UUID dedicado: responsável + sócio + admin.
 * Sem UUID: fallback admin/RH.
 */
export function canResponderAjudaFinal(
  colaboradorId: string | null | undefined,
  role: string | null | undefined
): boolean {
  if (canResponderAjudaPorId(colaboradorId)) return true;
  const r = normalizePortalRole(role);
  if (r === 'socio' || r === 'admin') return true;
  if (temResponsavelAjudaDedicado()) return false;
  return canResponderAjudaLegacy(role);
}

/**
 * Quem pode abrir /portal/ajuda-inbox.
 * Com responsável dedicado: sócio + admin + o próprio responsável.
 * Sem dedicado: sócio + admin + RH (legado).
 */
export function canVisualizarAjuda(
  role: string | null | undefined,
  colaboradorId?: string | null
): boolean {
  const r = normalizePortalRole(role);
  if (r === 'socio' || r === 'admin') return true;
  if (canResponderAjudaPorId(colaboradorId ?? null)) return true;
  if (!temResponsavelAjudaDedicado() && r === 'rh') return true;
  return false;
}

/** Sócios e admin podem apagar registros do canal de ajuda (LGPD / limpeza). */
export function canExcluirMensagensAjuda(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}

/** Quem acede à sala da equipe e às mensagens diretas (sócios, admin, responsável ajuda). */
export function canAcessarChatEquipe(
  role: string | null | undefined,
  colaboradorId?: string | null
): boolean {
  return canVisualizarAjuda(role, colaboradorId);
}

/** @deprecated Preferir `canResponderAjudaFinal`. */
export function canResponderAjuda(role: string | null | undefined): boolean {
  return canResponderAjudaLegacy(role);
}
