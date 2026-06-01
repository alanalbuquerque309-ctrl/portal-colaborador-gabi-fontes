import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { temEquipeAvaliacaoDireta } from '@/lib/avaliacao-direta';

export type PortalGerenteContext = {
  colaboradorId: string;
  unidadeId: string;
};

/** Aceita perfil de quem avalia a equipe (gerente/master/admin). */
export function isRoleGerenteAvaliador(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'admin';
}

/** Sócia/RH com vínculo direto (ex.: Gabriela e Keila → Thaís/Lucas; Daniel → Keila). */
export async function podeUsarAvaliacaoEquipeSemanal(
  supabase: ReturnType<typeof createAdminClient>,
  colaboradorId: string,
  role: string | null | undefined
): Promise<boolean> {
  if (isRoleGerenteAvaliador(role)) return true;
  const r = normalizePortalRole(role);
  if (r === 'socio' || r === 'rh') {
    return temEquipeAvaliacaoDireta(supabase, colaboradorId);
  }
  return false;
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

    const pode =
      data &&
      (await podeUsarAvaliacaoEquipeSemanal(supabase, data.id, data.role as string));

    if (error || !data || !pode) {
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
