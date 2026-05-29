import type { SupabaseClient } from '@supabase/supabase-js';
import { selectColaboradorLoginRowByLogin } from '@/lib/colaborador-forca-troca-compat';
import type { PortalSessionPayload } from '@/lib/portal-session-cookies';

/**
 * Resolve colaborador para restaurar sessão do portal a partir do login admin (env ou body).
 */
export async function resolveColaboradorForAdminBridge(
  supabase: SupabaseClient,
  loginHint?: string | null
): Promise<PortalSessionPayload | null> {
  const hinted = String(loginHint ?? '').trim();
  if (hinted) {
    const { data: col } = await selectColaboradorLoginRowByLogin(supabase, hinted);
    if (col?.id && col.unidade_id) {
      return {
        id: col.id,
        unidade_id: col.unidade_id,
        role: (col as { role?: string | null }).role,
      };
    }
  }

  const envLogin = process.env.ADMIN_ALAN_LOGIN?.trim();
  if (envLogin) {
    const { data: col } = await selectColaboradorLoginRowByLogin(supabase, envLogin);
    if (col?.id && col.unidade_id) {
      return {
        id: col.id,
        unidade_id: col.unidade_id,
        role: (col as { role?: string | null }).role,
      };
    }
  }

  const envId = process.env.ADMIN_PORTAL_COLABORADOR_ID?.trim();
  if (envId) {
    const { data: col } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role')
      .eq('id', envId)
      .maybeSingle();
    if (col?.id && col.unidade_id) {
      return {
        id: col.id,
        unidade_id: col.unidade_id,
        role: (col as { role?: string | null }).role,
      };
    }
  }

  return null;
}
