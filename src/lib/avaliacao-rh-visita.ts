import type { createAdminClient } from '@/lib/supabase/admin';
import { buildMapaAvaliacaoDireta } from '@/lib/avaliacao-direta';
import { colaboradorElegivelVisitaRh } from '@/lib/avaliacao-rh-visita-access';
import { colaboradorForaVisitaRh } from '@/lib/colaborador-fora-operacao-presencial';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type MembroRedeRhVisita = {
  id: string;
  nome: string;
  role: string | null;
  cargo: string | null;
  setor: string | null;
  unidade_nome: string | null;
  unidade_slug: string | null;
  onboarding_completo: boolean;
  operacao_apto: boolean;
  tipo_escala: string | null;
};

export async function listarRedeParaVisitaRh(
  supabase: SupabaseAdmin,
  avaliadorId: string,
  filtros?: { unidade_slug?: string; setor?: string; q?: string }
): Promise<MembroRedeRhVisita[]> {
  let query = supabase
    .from('colaboradores')
    .select(
      'id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto, unidade_id, unidades(nome, slug)'
    )
    .order('nome', { ascending: true });

  if (filtros?.unidade_slug?.trim()) {
    const { data: u } = await supabase
      .from('unidades')
      .select('id')
      .eq('slug', filtros.unidade_slug.trim())
      .maybeSingle();
    if (u?.id) query = query.eq('unidade_id', String(u.id));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const mapaDirect = await buildMapaAvaliacaoDireta(supabase);

  const qNorm = filtros?.q?.trim().toLowerCase() ?? '';
  const setorFiltro = filtros?.setor?.trim() ?? '';

  return (data ?? [])
    .map((c) => {
      const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
      return {
        id: String(c.id),
        nome: String(c.nome ?? ''),
        role: (c as { role?: string | null }).role ?? null,
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        setor: (c as { setor?: string | null }).setor ?? null,
        unidade_nome: unidade && typeof unidade === 'object' ? String((unidade as { nome?: string }).nome ?? '') : null,
        unidade_slug: unidade && typeof unidade === 'object' ? String((unidade as { slug?: string }).slug ?? '') : null,
        onboarding_completo: Boolean((c as { onboarding_completo?: boolean }).onboarding_completo),
        operacao_apto: (c as { operacao_apto?: boolean }).operacao_apto === true,
        tipo_escala: (c as { tipo_escala?: string | null }).tipo_escala ?? null,
      };
    })
    .filter((c) => colaboradorElegivelVisitaRh(c, avaliadorId))
    .filter((c) => !colaboradorForaVisitaRh(c))
    .filter((c) => !mapaDirect.alvosExclusivos.has(c.id))
    .filter((c) => {
      const r = normalizePortalRole(c.role);
      if (r === 'socio') return false;
      return true;
    })
    .filter((c) => {
      if (setorFiltro && (c.setor?.trim() ?? '') !== setorFiltro) return false;
      if (qNorm && !c.nome.toLowerCase().includes(qNorm)) return false;
      return true;
    });
}
