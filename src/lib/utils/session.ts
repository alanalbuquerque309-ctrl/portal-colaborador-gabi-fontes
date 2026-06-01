/**
 * Sessão do portal — colaborador_id, unidade_id e role em cookies.
 * Usado após login e ao finalizar onboarding.
 * role='socio' ou 'admin' → acesso às 3 lojas.
 */
import { normalizePortalRole } from '@/lib/roles';
import { PORTAL_MAX_AGE_PERSISTENT } from '@/lib/portal-login-persist';

const COOKIE_COLABORADOR = 'portal_colaborador_id';
const COOKIE_UNIDADE = 'portal_unidade_id';
const COOKIE_ROLE = 'portal_role';
const COOKIE_PENDING_CPF = 'portal_pending_cpf';
const COOKIE_SESSAO_LONGA = 'portal_sessao_longa';

export type SetPortalSessionOptions = {
  /** Padrão true: cookies com validade longa (manter conectado). */
  persistent?: boolean;
};

function cookieSuffix(persistent: boolean): string {
  const base = 'path=/; SameSite=Lax';
  if (persistent) {
    return `${base}; max-age=${PORTAL_MAX_AGE_PERSISTENT}`;
  }
  return base;
}

export function setPortalSession(
  colaboradorId: string,
  unidadeId: string,
  role?: string,
  opts?: SetPortalSessionOptions
): void {
  if (typeof document === 'undefined') return;
  const persistent = opts?.persistent !== false;
  const optsStr = cookieSuffix(persistent);
  document.cookie = `${COOKIE_COLABORADOR}=${colaboradorId}; ${optsStr}`;
  document.cookie = `${COOKIE_UNIDADE}=${unidadeId}; ${optsStr}`;
  if (role) {
    document.cookie = `${COOKIE_ROLE}=${normalizePortalRole(role)}; ${optsStr}`;
  } else {
    document.cookie = `${COOKIE_ROLE}=; path=/; max-age=0`;
  }
  if (persistent) {
    document.cookie = `${COOKIE_SESSAO_LONGA}=1; ${optsStr}`;
  } else {
    document.cookie = `${COOKIE_SESSAO_LONGA}=; path=/; max-age=0`;
  }
}

export function clearPortalSession(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_COLABORADOR}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_UNIDADE}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_ROLE}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_PENDING_CPF}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_SESSAO_LONGA}=; path=/; max-age=0`;
}

/** Login sem cadastro: CPF + senha no código. Usuário completa cadastro depois. */
export function setPendingRegistration(cpf: string): void {
  if (typeof document === 'undefined') return;
  const optsStr = cookieSuffix(true);
  document.cookie = `${COOKIE_COLABORADOR}=pending; ${optsStr}`;
  document.cookie = `${COOKIE_UNIDADE}=pending; ${optsStr}`;
  document.cookie = `${COOKIE_ROLE}=socio; ${optsStr}`;
  document.cookie = `${COOKIE_PENDING_CPF}=${cpf}; ${optsStr}`;
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
  return { colaboradorId: c, unidadeId: u, role: role ? normalizePortalRole(role) : undefined };
}

/** true se o colaborador é sócio ou admin (acesso às 3 lojas) */
export function isAdminOuSocio(role?: string): boolean {
  return role === 'socio' || role === 'admin';
}
