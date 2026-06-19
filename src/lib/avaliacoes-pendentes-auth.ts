import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';

export async function resolverAvaliadorPendenciasRede(): Promise<
  { ok: true; avaliadorId: string } | { ok: false; status: number; erro: string }
> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;

  if (colaboradorId && colaboradorId !== 'pending') {
    const supabase = createAdminClient();
    const { data: eu } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();

    const role = (eu as { role?: string } | null)?.role ?? '';
    if (!podeVerPendenciasSemanaRede(role)) {
      return { ok: false, status: 403, erro: 'Acesso restrito a sócios e administrador.' };
    }
    return { ok: true, avaliadorId: colaboradorId };
  }

  const ctx = await getAdminViewerContext();
  if (ctx?.kind === 'password_session') {
    const supabase = createAdminClient();
    const { data: adminRow } = await supabase
      .from('colaboradores')
      .select('id, role')
      .in('role', ['admin', 'socio'])
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (adminRow?.id) {
      return { ok: true, avaliadorId: String(adminRow.id) };
    }
    return {
      ok: false,
      status: 401,
      erro: 'Faça login no portal (conta admin/sócio) para registrar férias.',
    };
  }

  if (ctx?.kind === 'portal' && podeVerPendenciasSemanaRede(ctx.role)) {
    const cid = cookieStore.get('portal_colaborador_id')?.value;
    if (cid && cid !== 'pending') return { ok: true, avaliadorId: cid };
  }

  return { ok: false, status: 401, erro: 'Faça login no portal' };
}

export async function autorizadoPendenciasRede(): Promise<
  { ok: true; rhAvaliadorId?: string } | { ok: false; status: number; erro: string }
> {
  const auth = await resolverAvaliadorPendenciasRede();
  if (!auth.ok) return auth;
  return { ok: true, rhAvaliadorId: auth.avaliadorId };
}
