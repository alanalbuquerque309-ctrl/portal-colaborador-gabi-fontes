import type { createAdminClient } from '@/lib/supabase/admin';
import { isSetorValido } from '@/lib/constants/colaborador-org';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LiderSetorRow = {
  id: string;
  unidade_id: string;
  setor: string;
  lider_id: string;
  ativo: boolean;
  lider_nome?: string;
  unidade_nome?: string;
};

/** Pares (unidade, setor) em que este colaborador está configurado como líder. */
export async function listarSetoresLideradosPor(
  supabase: SupabaseAdmin,
  liderId: string
): Promise<Array<{ unidade_id: string; setor: string }>> {
  const { data, error } = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor')
    .eq('lider_id', liderId)
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  const out: Array<{ unidade_id: string; setor: string }> = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const uid = String(row.unidade_id ?? '');
    const setor = String(row.setor ?? '').trim();
    if (!uid || !setor) continue;
    const key = `${uid}|${setor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ unidade_id: uid, setor });
  }
  return out;
}

/** Líderes configurados para unidade + setor do colaborador (inclui wildcard `*` na unidade). */
export async function listarLideresConfigPorUnidadeSetor(
  supabase: SupabaseAdmin,
  unidadeId: string | null | undefined,
  setor: string | null | undefined
): Promise<Array<{ id: string; nome: string; role: string }>> {
  if (!unidadeId || !setor || !isSetorValido(setor)) return [];

  const setorTrim = setor.trim();
  const { data: porSetor, error: errSetor } = await supabase
    .from('lideres_por_setor')
    .select('lider_id')
    .eq('unidade_id', unidadeId)
    .eq('setor', setorTrim)
    .eq('ativo', true);

  const { data: porUnidade, error: errUnidade } = await supabase
    .from('lideres_por_setor')
    .select('lider_id')
    .eq('unidade_id', unidadeId)
    .eq('setor', SETOR_TODOS_NA_UNIDADE)
    .eq('ativo', true);

  const error = errSetor ?? errUnidade;
  if (error) {
    if (/lideres_por_setor|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const ids = Array.from(
    new Set(
      [...(porSetor ?? []), ...(porUnidade ?? [])]
        .map((r) => String(r.lider_id ?? ''))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return [];

  const { data: cols, error: errCols } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .in('id', ids);
  if (errCols) throw new Error(errCols.message);

  return (cols ?? []).map((c) => ({
    id: String(c.id),
    nome: String(c.nome ?? ''),
    role: String((c as { role?: string }).role ?? ''),
  }));
}

/** Colaboradores (role colaborador) no mesmo unidade+setor — liderados derivados. `setor` `*` = toda a unidade. */
export async function listarColaboradoresPorUnidadeSetor(
  supabase: SupabaseAdmin,
  unidadeId: string,
  setor: string,
  excluirId?: string
): Promise<Array<{ id: string; nome: string; role: string | null; cargo: string | null; setor: string | null }>> {
  const setorCfg = setor.trim();
  if (setorCfg !== SETOR_TODOS_NA_UNIDADE && !isSetorValido(setorCfg)) return [];

  let query = supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor')
    .eq('unidade_id', unidadeId)
    .order('nome');

  if (setorCfg !== SETOR_TODOS_NA_UNIDADE) {
    query = query.eq('setor', setorCfg);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((c) => {
      const id = String(c.id);
      if (excluirId && id === excluirId) return false;
      return normalizePortalRole((c as { role?: string }).role) === 'colaborador';
    })
    .map((c) => ({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      role: (c as { role?: string | null }).role ?? null,
      cargo: (c as { cargo?: string | null }).cargo ?? null,
      setor: (c as { setor?: string | null }).setor ?? null,
    }));
}
