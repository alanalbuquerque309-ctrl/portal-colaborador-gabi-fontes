import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  adminPathPermitidoRh,
  isRoleAdminCompleto,
  isRoleAdminRh,
  podeEditarCadastroColaborador,
  podeEditarEscalasAdmin,
  podeEditarLiderancaMapaCompleto,
  resolveAdminNivel,
  type AdminNivelAcesso,
} from '@/lib/admin-access';
import { normalizePortalRole } from '@/lib/roles';

const ADMIN_COOKIE = 'admin_session';
const PORTAL_COLABORADOR = 'portal_colaborador_id';

export type AdminViewerContext =
  | { kind: 'password_session'; nivel: 'senha' }
  | { kind: 'portal'; role: string; nivel: AdminNivelAcesso };

async function portalColaboradorRole(colaboradorId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();
    return normalizePortalRole((data as { role?: string } | null)?.role);
  } catch {
    return null;
  }
}

/** Qualquer acesso ao painel admin (completo, gerente ou RH limitado). */
export async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value === '1') return true;

  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (!colaboradorId || colaboradorId === 'pending') return false;

  const role = await portalColaboradorRole(colaboradorId);
  return isRoleAdminCompleto(role) || isRoleAdminRh(role);
}

/** Sócios, admin, master, gerente ou sessão por senha (não inclui RH). */
export async function isAdminFullAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value === '1') return true;

  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (!colaboradorId || colaboradorId === 'pending') return false;

  const role = await portalColaboradorRole(colaboradorId);
  return isRoleAdminCompleto(role);
}

export async function getAdminViewerContext(): Promise<AdminViewerContext | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value === '1') {
    return { kind: 'password_session', nivel: 'senha' };
  }

  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (!colaboradorId || colaboradorId === 'pending') return null;

  const role = await portalColaboradorRole(colaboradorId);
  if (!role) return null;
  const nivel = resolveAdminNivel(role, false);
  if (!nivel) return null;

  return { kind: 'portal', role, nivel };
}

/** Bloqueia RH em APIs só para gestão completa. */
export async function requireAdminFullApi(): Promise<
  { ok: true; ctx: AdminViewerContext } | { ok: false; response: NextResponse }
> {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 }),
    };
  }
  if (ctx.nivel === 'rh_limitado') {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'Acesso restrito à gestão completa (sócios/admin).' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, ctx };
}

/** RH limitado só nas rotas permitidas (uso opcional em páginas). */
export function rhPodeAcessarAdminPath(pathname: string): boolean {
  return adminPathPermitidoRh(pathname);
}

/**
 * Criar, editar e excluir cadastros de colaboradores:
 * admin (Daniel), RH (Keila), sócios e login por senha.
 * Gerentes/líderes não têm acesso de escrita.
 */
export async function requireAdminCadastroEditApi(): Promise<
  { ok: true; ctx: AdminViewerContext } | { ok: false; response: NextResponse }
> {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 }),
    };
  }
  const senha = ctx.kind === 'password_session';
  const role = ctx.kind === 'portal' ? ctx.role : null;
  if (!podeEditarCadastroColaborador(role, senha)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'Somente admin, RH ou sócios podem criar e editar cadastros.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, ctx };
}

/** Editar escalas/folgas: sócios, admin, RH ou senha. */
export async function requireAdminEscalasEditApi(): Promise<
  { ok: true; ctx: AdminViewerContext } | { ok: false; response: NextResponse }
> {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 }),
    };
  }
  const senha = ctx.kind === 'password_session';
  const role = ctx.kind === 'portal' ? ctx.role : null;
  if (!podeEditarEscalasAdmin(role, senha)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'Sem permissão para editar escalas e folgas.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, ctx };
}

/** Editar mapa de liderança e aplicar padrão: sócios, admin portal ou login por senha. */
export async function requireAdminLiderancaMapaApi(): Promise<
  { ok: true; ctx: AdminViewerContext } | { ok: false; response: NextResponse }
> {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 }),
    };
  }
  const senha = ctx.kind === 'password_session';
  const role = ctx.kind === 'portal' ? ctx.role : null;
  if (!podeEditarLiderancaMapaCompleto(role, senha)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, erro: 'Somente sócios/admin ou Daniel podem alterar o mapa de liderança.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, ctx };
}

/** @deprecated Preferir `isAdminFullAuthorized` para APIs exclusivas de sócio/admin. */
export async function isMasterPortalSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (!colaboradorId) return false;
  const role = await portalColaboradorRole(colaboradorId);
  return normalizePortalRole(role) === 'master';
}

/** Reclamações no admin: sócios (portal) ou login por senha. Role `admin` não vê. */
export function canViewReclamacoesAdmin(ctx: AdminViewerContext | null): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return ctx.role === 'socio';
}
