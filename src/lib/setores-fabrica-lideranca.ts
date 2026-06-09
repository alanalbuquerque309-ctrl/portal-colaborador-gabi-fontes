import {
  REGRAS_LIDERANCA_OPERACIONAL,
  SETORES_LIDERANCA_DANIEL_TRANSVERSAL,
} from '@/lib/config-lideranca-operacional';
import { MURAL_GRUPO_MESQUITA_SLUGS } from '@/lib/mural-unidade-grupo';
import type { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Setores com líderes dedicados na unidade Fábrica (mapa operacional). */
export const SETORES_LIDERANCA_NA_FABRICA = REGRAS_LIDERANCA_OPERACIONAL.filter(
  (r): r is Extract<(typeof REGRAS_LIDERANCA_OPERACIONAL)[number], { tipo: 'unidade_setor' }> =>
    r.tipo === 'unidade_setor' && r.unidade_slug === 'fabrica'
).map((r) => r.setor);

export function isSetorLiderancaDanielTransversal(setor: string | null | undefined): boolean {
  const s = String(setor ?? '').trim();
  if (!s) return false;
  return (SETORES_LIDERANCA_DANIEL_TRANSVERSAL as readonly string[]).includes(s);
}

export function isSetorLideradoNaFabrica(setor: string | null | undefined): boolean {
  const s = String(setor ?? '').trim();
  if (!s) return false;
  return (SETORES_LIDERANCA_NA_FABRICA as readonly string[]).includes(s);
}

/** Setores da fábrica não entram na lista completa (`*`) de gerentes de loja. */
export function deveExcluirSetorDaListaCompletaUnidade(
  unidadeSlug: string | null | undefined,
  setor: string | null | undefined
): boolean {
  if (!unidadeSlug || unidadeSlug === 'fabrica') return false;
  return isSetorLideradoNaFabrica(setor);
}

export async function resolverUnidadeIdPorSlug(
  supabase: SupabaseAdmin,
  slug: string
): Promise<string | null> {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function resolverUnidadeIdsGrupoMesquita(supabase: SupabaseAdmin): Promise<string[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('id')
    .in('slug', [...MURAL_GRUPO_MESQUITA_SLUGS]);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.id)).filter(Boolean);
}

export async function resolverUnidadeIdFabrica(supabase: SupabaseAdmin): Promise<string | null> {
  return resolverUnidadeIdPorSlug(supabase, 'fabrica');
}

/** Todas as unidades cadastradas (CD/Estoque/etc. podem estar em Administrativo). */
export async function resolverTodasUnidadeIds(supabase: SupabaseAdmin): Promise<string[]> {
  const { data, error } = await supabase.from('unidades').select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.id)).filter(Boolean);
}
