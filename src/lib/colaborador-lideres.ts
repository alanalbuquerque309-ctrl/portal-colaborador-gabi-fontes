import { createAdminClient } from '@/lib/supabase/admin';
import {
  listarColaboradoresPorUnidadeSetor,
  listarLideresConfigPorUnidadeSetor,
  listarSetoresLideradosPor,
} from '@/lib/lideres-por-setor';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LiderVinculado = {
  id: string;
  nome: string;
  role: string;
};

type MembroEquipe = {
  id: string;
  nome: string;
  role: string | null;
  cargo: string | null;
  setor: string | null;
};

export async function listarLideresDoColaborador(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  liderIdLegado?: string | null,
  opts?: { unidadeId?: string | null; setor?: string | null; /** Avaliação de liderança: só `lideres_por_setor`, ignora vínculo antigo. */ apenasDaConfig?: boolean }
): Promise<LiderVinculado[]> {
  const out = new Map<string, LiderVinculado>();

  let unidadeId = opts?.unidadeId ?? null;
  let setor = opts?.setor ?? null;
  if (!unidadeId || setor === null || setor === undefined) {
    const { data: eu } = await supabase
      .from('colaboradores')
      .select('unidade_id, setor')
      .eq('id', colaboradorId)
      .maybeSingle();
    if (eu) {
      unidadeId = unidadeId ?? (eu.unidade_id as string | null);
      setor = setor ?? (eu.setor as string | null);
    }
  }

  try {
    const porSetor = await listarLideresConfigPorUnidadeSetor(supabase, unidadeId, setor);
    for (const l of porSetor) {
      if (l.id !== colaboradorId) out.set(l.id, l);
    }
  } catch {
    /* tabela ainda não migrada */
  }

  if (opts?.apenasDaConfig) {
    return Array.from(out.values());
  }

  const { data: vinculos } = await supabase
    .from('colaboradores_lideres')
    .select('lider:colaboradores!colaboradores_lideres_lider_id_fkey(id, nome, role)')
    .eq('colaborador_id', colaboradorId)
    .eq('ativo', true);

  for (const row of vinculos ?? []) {
    const raw = (row as { lider?: LiderVinculado | LiderVinculado[] | null }).lider;
    const lider = Array.isArray(raw) ? raw[0] : raw;
    if (lider?.id && lider.id !== colaboradorId) {
      out.set(String(lider.id), {
        id: String(lider.id),
        nome: String(lider.nome ?? ''),
        role: String(lider.role ?? ''),
      });
    }
  }

  if (liderIdLegado && !out.has(liderIdLegado) && liderIdLegado !== colaboradorId) {
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
): Promise<MembroEquipe[]> {
  const porId = new Map<string, MembroEquipe>();

  try {
    const setoresLiderados = await listarSetoresLideradosPor(supabase, liderId);
    for (const { unidade_id: uid, setor } of setoresLiderados) {
      // Unidade vem de `lideres_por_setor` (ex.: Joyce lidera Mesquita mesmo com cadastro noutra unidade).
      const membros = await listarColaboradoresPorUnidadeSetor(supabase, uid, setor, liderId);
      for (const m of membros) porId.set(m.id, m);
    }
  } catch {
    /* tabela ainda não migrada */
  }

  const ids = new Set<string>();

  const { data: vinculos } = await supabase
    .from('colaboradores_lideres')
    .select('colaborador_id')
    .eq('lider_id', liderId)
    .eq('ativo', true);
  for (const row of vinculos ?? []) {
    if (row.colaborador_id) ids.add(String(row.colaborador_id));
  }

  let legado = supabase.from('colaboradores').select('id').eq('lider_id', liderId);
  if (unidadeId) legado = legado.eq('unidade_id', unidadeId);
  const { data: legadoRows } = await legado;
  for (const row of legadoRows ?? []) {
    if (row.id) ids.add(String(row.id));
  }

  if (ids.size > 0) {
    let query = supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, setor, unidade_id')
      .in('id', Array.from(ids))
      .neq('id', liderId)
      .order('nome');
    if (unidadeId) query = query.eq('unidade_id', unidadeId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    for (const c of data ?? []) {
      const id = String(c.id);
      porId.set(id, {
        id,
        nome: String(c.nome ?? ''),
        role: (c as { role?: string | null }).role ?? null,
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        setor: (c as { setor?: string | null }).setor ?? null,
      });
    }
  }

  return Array.from(porId.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
