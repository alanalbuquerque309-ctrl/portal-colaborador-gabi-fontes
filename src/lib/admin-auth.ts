import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_COOKIE = 'admin_session';
const PORTAL_COLABORADOR = 'portal_colaborador_id';

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
