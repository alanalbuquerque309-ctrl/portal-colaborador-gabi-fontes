import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import {
  colaboradorElegivelChecklistPiloto,
  podeAcessarChecklistsOperacionais,
  podeVerHistoricoChecklistsRede,
} from '@/lib/checklists/access';

export type SessaoChecklist = {
  colaboradorId: string;
  unidadeId: string | null;
  role: string;
  nome: string;
};

export async function resolverSessaoChecklist(): Promise<
  { ok: true; sessao: SessaoChecklist } | { ok: false; status: number; erro: string }
> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeCookie = cookieStore.get('portal_unidade_id')?.value ?? null;

  if (!colaboradorId || colaboradorId === 'pending') {
    return { ok: false, status: 401, erro: 'Faça login no portal' };
  }

  const supabase = createAdminClient();
  const { data: col, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, unidade_id')
    .eq('id', colaboradorId)
    .maybeSingle();

  if (error || !col) {
    return { ok: false, status: 404, erro: 'Perfil não encontrado' };
  }

  const role = normalizePortalRole((col as { role?: string }).role);
  if (!podeAcessarChecklistsOperacionais(role) && !podeVerHistoricoChecklistsRede(role)) {
    return { ok: false, status: 403, erro: 'Checklists operacionais ainda não disponíveis para seu perfil.' };
  }

  const unidadeId = unidadeCookie || String((col as { unidade_id?: string }).unidade_id ?? '') || null;

  // Piloto Mesquita: gerentes de outras lojas não veem menu nem APIs do portal.
  if (podeAcessarChecklistsOperacionais(role)) {
    try {
      const elegivel = await colaboradorElegivelChecklistPiloto(supabase, {
        colaboradorId,
        unidadeId,
        role,
      });
      if (!elegivel) {
        return {
          ok: false,
          status: 403,
          erro: 'Checklists em piloto só na Mesquita por enquanto.',
        };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao validar unidade do checklist.';
      return { ok: false, status: 500, erro: msg };
    }
  }

  return {
    ok: true,
    sessao: {
      colaboradorId,
      unidadeId,
      role,
      nome: String((col as { nome?: string }).nome ?? ''),
    },
  };
}

export function unidadeIdParam(
  sessao: SessaoChecklist,
  param: string | null | undefined
): string | null {
  const id = (param ?? '').trim();
  if (id) return id;
  return sessao.unidadeId;
}
