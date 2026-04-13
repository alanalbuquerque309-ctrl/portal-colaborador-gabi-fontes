/**
 * Sessão do portal — colaborador_id, unidade_id e role em cookies.
 * Usado após login e ao finalizar onboarding.
 * role='socio' ou 'admin' → acesso às 3 lojas.
 */

const COOKIE_COLABORADOR = 'portal_colaborador_id';
const COOKIE_UNIDADE = 'portal_unidade_id';
const COOKIE_ROLE = 'portal_role';
const COOKIE_PENDING_CPF = 'portal_pending_cpf';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export function setPortalSession(
  colaboradorId: string,
  unidadeId: string,
  role?: string
): void {
  if (typeof document === 'undefined') return;
  const opts = `path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  document.cookie = `${COOKIE_COLABORADOR}=${colaboradorId}; ${opts}`;
  document.cookie = `${COOKIE_UNIDADE}=${unidadeId}; ${opts}`;
  if (role) {
    document.cookie = `${COOKIE_ROLE}=${role}; ${opts}`;
  } else {
    document.cookie = `${COOKIE_ROLE}=; path=/; max-age=0`;
  }
}

export function clearPortalSession(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_COLABORADOR}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_UNIDADE}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_ROLE}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_PENDING_CPF}=; path=/; max-age=0`;
}

/** Login sem cadastro: CPF + senha no código. Usuário completa cadastro depois. */
export function setPendingRegistration(cpf: string): void {
  if (typeof document === 'undefined') return;
  const opts = `path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  document.cookie = `${COOKIE_COLABORADOR}=pending; ${opts}`;
  document.cookie = `${COOKIE_UNIDADE}=pending; ${opts}`;
  document.cookie = `${COOKIE_ROLE}=socio; ${opts}`;
  document.cookie = `${COOKIE_PENDING_CPF}=${cpf}; ${opts}`;
}

export function isPendingRegistration(): boolean {
  return getCookie(COOKIE_COLABORADOR) === 'pending';
}

export function getPendingCpf(): string | null {
  return getCookie(COOKIE_PENDING_CPF);
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export function getPortalSession(): {
  colaboradorId: string;
  unidadeId: string;
  role?: string;
} | null {
  const c = getCookie(COOKIE_COLABORADOR);
  if (!c) return null;
  const u = getCookie(COOKIE_UNIDADE) ?? '';
  const role = getCookie(COOKIE_ROLE);
  return { colaboradorId: c, unidadeId: u, role: role || undefined };
}

/** true se o colaborador é sócio ou admin (acesso às 3 lojas) */
export function isAdminOuSocio(role?: string): boolean {
  return role === 'socio' || role === 'admin';
}
