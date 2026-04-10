import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export type PortalMasterContext = {
  colaboradorId: string;
  unidadeId: string;
};

export async function requirePortalMasterSession(): Promise<
  { ok: true; ctx: PortalMasterContext } | { ok: false; response: Response }
> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return {
      ok: false,
      response: Response.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 }),
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, role, unidade_id')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !data || data.role !== 'master') {
      return {
        ok: false,
        response: Response.json({ ok: false, erro: 'Acesso restrito a perfil Master' }, { status: 403 }),
      };
    }

    return {
      ok: true,
      ctx: { colaboradorId: data.id, unidadeId: data.unidade_id },
    };
  } catch {
    return {
      ok: false,
      response: Response.json({ ok: false, erro: 'Erro ao validar sessão' }, { status: 500 }),
    };
  }
}
