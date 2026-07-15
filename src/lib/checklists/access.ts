import { normalizePortalRole } from '@/lib/roles';
import type { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Legado: mantido para flags de UI; gerentes já entram por cargo. */
export function checklistsLideresAtivos(): boolean {
  return process.env.PORTAL_CHECKLIST_LIDERES_ATIVO !== 'false';
}

/** Preencher checklists no portal: gerente de loja, RH, admin, master e sócio. */
export function podeAcessarChecklistsOperacionais(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'socio' || r === 'admin' || r === 'rh';
}

/** Histórico / consulta na rede (admin). */
export function podeVerHistoricoChecklistsRede(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master' || r === 'rh';
}

/** Piloto portal: por enquanto só Mesquita. Ampliar quando Barra/NI entrarem. */
export const CHECKLIST_PILOTO_UNIDADE_SLUGS = ['mesquita'] as const;

export function slugsChecklistPiloto(): string[] {
  return [...CHECKLIST_PILOTO_UNIDADE_SLUGS];
}

/**
 * Portal operacional de checklists no piloto:
 * - sócio/admin/RH/master: abrem o hub (API só lista unidades do piloto);
 * - gerente: só se a unidade do cadastro for do piloto OU se liderar setor nessa unidade.
 */
export async function colaboradorElegivelChecklistPiloto(
  supabase: SupabaseAdmin,
  opts: { colaboradorId: string; unidadeId: string | null; role: string }
): Promise<boolean> {
  const r = normalizePortalRole(opts.role);
  if (r === 'socio' || r === 'admin' || r === 'rh' || r === 'master') return true;

  const piloto = slugsChecklistPiloto();
  if (piloto.length === 0) return false;

  if (opts.unidadeId) {
    const { data: unidade } = await supabase
      .from('unidades')
      .select('slug')
      .eq('id', opts.unidadeId)
      .maybeSingle();
    const slug = String((unidade as { slug?: string } | null)?.slug ?? '');
    if (piloto.includes(slug)) return true;
  }

  const { data: unidadesPiloto, error: errU } = await supabase
    .from('unidades')
    .select('id')
    .in('slug', piloto);
  if (errU) throw new Error(errU.message);
  const unidadeIds = (unidadesPiloto ?? []).map((u) => String(u.id)).filter(Boolean);
  if (unidadeIds.length === 0) return false;

  const { data: lps, error: errL } = await supabase
    .from('lideres_por_setor')
    .select('id')
    .eq('lider_id', opts.colaboradorId)
    .eq('ativo', true)
    .in('unidade_id', unidadeIds)
    .limit(1);
  if (errL) {
    if (/lideres_por_setor|does not exist/i.test(errL.message)) return false;
    throw new Error(errL.message);
  }
  return (lps ?? []).length > 0;
}
