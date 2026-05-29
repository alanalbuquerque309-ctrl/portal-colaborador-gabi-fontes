import type { NextResponse } from 'next/server';
import { normalizePortalRole } from '@/lib/roles';

export const PORTAL_COOKIE_COLABORADOR = 'portal_colaborador_id';
export const PORTAL_COOKIE_UNIDADE = 'portal_unidade_id';
export const PORTAL_COOKIE_ROLE = 'portal_role';

const PORTAL_MAX_AGE = 60 * 60 * 24 * 30;
const ADMIN_MAX_AGE = 60 * 60 * 8;

export const ADMIN_COOKIE = 'admin_session';

function cookieOpts(maxAge: number) {
  return {
    path: '/' as const,
    maxAge,
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export type PortalSessionPayload = {
  id: string;
  unidade_id: string;
  role?: string | null;
};

/** Grava cookies de sessão do portal na resposta HTTP (fonte confiável para APIs server-side). */
export function applyPortalSessionCookies(res: NextResponse, col: PortalSessionPayload): void {
  const role = normalizePortalRole(col.role);
  const opts = cookieOpts(PORTAL_MAX_AGE);
  res.cookies.set(PORTAL_COOKIE_COLABORADOR, col.id, opts);
  res.cookies.set(PORTAL_COOKIE_UNIDADE, col.unidade_id, opts);
  res.cookies.set(PORTAL_COOKIE_ROLE, role, opts);
  res.cookies.set('portal_pending_cpf', '', { path: '/', maxAge: 0 });
}

/** Sócios/admin/gerente/master: ao logar no portal, liberar Admin sem segunda senha. */
export function applyAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE, '1', { ...cookieOpts(ADMIN_MAX_AGE), httpOnly: true });
}

export function rolesComAcessoAdmin(role: string): boolean {
  return role === 'socio' || role === 'admin' || role === 'master' || role === 'gerente';
}
