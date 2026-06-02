import type { NextResponse } from 'next/server';

import { normalizePortalRole } from '@/lib/roles';

import {

  ADMIN_MAX_AGE_CURTA,

  ADMIN_MAX_AGE_PERSISTENT,

  PORTAL_COOKIE_SESSAO_LONGA,

  PORTAL_MAX_AGE_PERSISTENT,

} from '@/lib/portal-login-persist';



export const PORTAL_COOKIE_COLABORADOR = 'portal_colaborador_id';

export const PORTAL_COOKIE_UNIDADE = 'portal_unidade_id';

export const PORTAL_COOKIE_ROLE = 'portal_role';



export const ADMIN_COOKIE = 'admin_session';



export type PortalSessionCookieOptions = {

  /** true = cookies com validade longa; false = sessão do navegador (some ao fechar). */

  persistent?: boolean;

};



function cookieBase() {

  return {

    path: '/' as const,

    httpOnly: false,

    sameSite: 'lax' as const,

    secure: process.env.NODE_ENV === 'production',

  };

}



function portalCookieOpts(persistent: boolean) {

  const base = cookieBase();

  if (persistent) {

    return { ...base, maxAge: PORTAL_MAX_AGE_PERSISTENT };

  }

  return base;

}



export type PortalSessionPayload = {

  id: string;

  unidade_id: string;

  role?: string | null;

};



/** Grava cookies de sessão do portal na resposta HTTP (fonte confiável para APIs server-side). */

export function applyPortalSessionCookies(

  res: NextResponse,

  col: PortalSessionPayload,

  opts?: PortalSessionCookieOptions

): void {

  const persistent = opts?.persistent !== false;

  const role = normalizePortalRole(col.role);

  const cookieOpts = portalCookieOpts(persistent);



  res.cookies.set(PORTAL_COOKIE_COLABORADOR, col.id, cookieOpts);

  res.cookies.set(PORTAL_COOKIE_UNIDADE, col.unidade_id, cookieOpts);

  res.cookies.set(PORTAL_COOKIE_ROLE, role, cookieOpts);



  if (persistent) {

    res.cookies.set(PORTAL_COOKIE_SESSAO_LONGA, '1', cookieOpts);

  } else {

    res.cookies.set(PORTAL_COOKIE_SESSAO_LONGA, '', { path: '/', maxAge: 0 });

  }



  res.cookies.set('portal_pending_cpf', '', { path: '/', maxAge: 0 });

}



/** Sócios/admin/gerente/master: ao logar no portal, liberar Admin sem segunda senha. */

export function applyAdminSessionCookie(

  res: NextResponse,

  opts?: PortalSessionCookieOptions

): void {

  const persistent = opts?.persistent !== false;

  const maxAge = persistent ? ADMIN_MAX_AGE_PERSISTENT : ADMIN_MAX_AGE_CURTA;

  res.cookies.set(ADMIN_COOKIE, '1', {

    ...cookieBase(),

    maxAge,

    httpOnly: true,

  });

}



export function rolesComAcessoAdmin(role: string): boolean {

  return role === 'socio' || role === 'admin' || role === 'master' || role === 'gerente';

}



/** Renova `portal_role` (e flag de sessão longa) após GET perfil. */

export function refreshPortalRoleCookie(res: NextResponse, role: string, sessaoLonga: boolean): void {

  res.cookies.set(PORTAL_COOKIE_ROLE, normalizePortalRole(role), portalCookieOpts(sessaoLonga));

}


