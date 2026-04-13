import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export type PortalRhContext = {
  colaboradorId: string;
  unidadeId: string;
};

/** Administrativo ou sócio: relatórios consolidados de avaliação. */
export async function requirePortalAdminSocioSession(): Promise<
  { ok: true; ctx: PortalRhContext } | { ok: false; response: Response }
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

    const role = ((data as { role?: string } | null)?.role || '').trim().toLowerCase();
    if (error || !data || (role !== 'admin' && role !== 'socio')) {
      return {
        ok: false,
        response: Response.json(
          { ok: false, erro: 'Apenas administrativo ou sócio podem consultar estes relatórios' },
          { status: 403 }
        ),
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
