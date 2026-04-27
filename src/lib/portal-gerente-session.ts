import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';

export type PortalGerenteContext = {
  colaboradorId: string;
  unidadeId: string;
};

/** Aceita perfil de quem avalia a equipe (gerente/master/admin). */
export function isRoleGerenteAvaliador(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'admin';
}

export async function requirePortalGerenteSession(): Promise<
  { ok: true; ctx: PortalGerenteContext } | { ok: false; response: Response }
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

    if (error || !data || !isRoleGerenteAvaliador(data.role as string)) {
      return {
        ok: false,
        response: Response.json(
          { ok: false, erro: 'Acesso restrito a liderança/admin (avaliação da equipe)' },
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
