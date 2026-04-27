import { createAdminClient } from '@/lib/supabase/admin';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LiderVinculado = {
  id: string;
  nome: string;
  role: string;
};

export async function listarLideresDoColaborador(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  liderIdLegado?: string | null
): Promise<LiderVinculado[]> {
  const out = new Map<string, LiderVinculado>();

  const { data: vinculos } = await supabase
    .from('colaboradores_lideres')
    .select('lider:colaboradores!colaboradores_lideres_lider_id_fkey(id, nome, role)')
    .eq('colaborador_id', colaboradorId)
    .eq('ativo', true);

  for (const row of vinculos ?? []) {
    const raw = (row as { lider?: LiderVinculado | LiderVinculado[] | null }).lider;
    const lider = Array.isArray(raw) ? raw[0] : raw;
    if (lider?.id) {
      out.set(String(lider.id), {
        id: String(lider.id),
        nome: String(lider.nome ?? ''),
        role: String(lider.role ?? ''),
      });
    }
  }

  if (liderIdLegado && !out.has(liderIdLegado)) {
    const { data: lider } = await supabase
      .from('colaboradores')
      .select('id, nome, role')
      .eq('id', liderIdLegado)
      .maybeSingle();
    if (lider?.id) {
      out.set(String(lider.id), {
        id: String(lider.id),
        nome: String(lider.nome ?? ''),
        role: String((lider as { role?: string }).role ?? ''),
      });
    }
  }

  return Array.from(out.values());
}

export async function listarEquipeDoLider(
  supabase: SupabaseAdmin,
  liderId: string,
  unidadeId?: string | null
): Promise<Array<{ id: string; nome: string; role: string | null; cargo: string | null; setor: string | null }>> {
  const ids = new Set<string>();

  const { data: vinculos } = await supabase
    .from('colaboradores_lideres')
    .select('colaborador_id')
    .eq('lider_id', liderId)
    .eq('ativo', true);
  for (const row of vinculos ?? []) {
    if (row.colaborador_id) ids.add(String(row.colaborador_id));
  }

  let legado = supabase
    .from('colaboradores')
    .select('id')
    .eq('lider_id', liderId);
  if (unidadeId) legado = legado.eq('unidade_id', unidadeId);
  const { data: legadoRows } = await legado;
  for (const row of legadoRows ?? []) {
    if (row.id) ids.add(String(row.id));
  }

  if (ids.size === 0) return [];

  let query = supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, unidade_id')
    .in('id', Array.from(ids))
    .neq('id', liderId)
    .order('nome');
  if (unidadeId) query = query.eq('unidade_id', unidadeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: String(c.id),
    nome: String(c.nome ?? ''),
    role: (c as { role?: string | null }).role ?? null,
    cargo: (c as { cargo?: string | null }).cargo ?? null,
    setor: (c as { setor?: string | null }).setor ?? null,
  }));
}
