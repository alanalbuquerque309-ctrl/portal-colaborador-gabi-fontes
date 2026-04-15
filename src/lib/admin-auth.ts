import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_COOKIE = 'admin_session';
const PORTAL_COLABORADOR = 'portal_colaborador_id';

export type AdminViewerContext =
  | { kind: 'password_session' }
  | { kind: 'portal'; role: string };

/**
 * Verifica se o usuário tem acesso ao painel admin.
 * Retorna true se:
 * - Cookie admin_session existe (login direto em /admin)
 * - OU sessão do portal com colaborador que tem role socio ou admin
 */
export async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value === '1') return true;

  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (!colaboradorId) return false;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .single();

    const role = (data as { role?: string } | null)?.role;
    return role === 'socio' || role === 'admin';
  } catch {
    return false;
  }
}

export async function getAdminViewerContext(): Promise<AdminViewerContext | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value === '1') {
    return { kind: 'password_session' };
  }

  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (!colaboradorId) return null;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .single();

    const role = String((data as { role?: string } | null)?.role || '').toLowerCase();
    if (role !== 'socio' && role !== 'admin') return null;
    return { kind: 'portal', role };
  } catch {
    return null;
  }
}

/** Reclamações no admin: sócios (portal) ou login por senha. Role `admin` não vê. */
export function canViewReclamacoesAdmin(ctx: AdminViewerContext | null): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return ctx.role === 'socio';
}
