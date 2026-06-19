import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { normalizePortalRole } from '@/lib/roles';
import { canVisualizarAlertasEmocional } from '@/lib/emocional-alertas-access';

async function resolverRoleGestorEmocional(
  colaboradorId: string,
  cookieRole: string | null | undefined
): Promise<string> {
  const cookieNorm = normalizePortalRole(cookieRole);
  const cookieRaw = String(cookieRole ?? '').trim();
  if (cookieRaw && cookieNorm !== 'colaborador') return cookieNorm;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();
    if (data?.role) return normalizePortalRole((data as { role?: string }).role);
  } catch {
    /* fallback cookie */
  }
  return cookieNorm;
}

export async function authGestorEmocional(): Promise<
  | { ok: true; colaboradorId: string; role: string; viaAdminSenha?: boolean }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const senhaAdmin = cookieStore.get('admin_session')?.value === '1';

  if (colaboradorId && colaboradorId !== 'pending') {
    const role = await resolverRoleGestorEmocional(
      colaboradorId,
      cookieStore.get('portal_role')?.value
    );
    if (canVisualizarAlertasEmocional(role, colaboradorId)) {
      return { ok: true, colaboradorId, role };
    }
  }

  if (senhaAdmin && (await isAdminAuthorized())) {
    return {
      ok: true,
      colaboradorId: colaboradorId ?? 'admin-senha',
      role: 'admin',
      viaAdminSenha: true,
    };
  }

  if (!colaboradorId || colaboradorId === 'pending') {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 }),
    };
  }
  return {
    ok: false,
    response: NextResponse.json({ ok: false, erro: 'Sem permissão' }, { status: 403 }),
  };
}
