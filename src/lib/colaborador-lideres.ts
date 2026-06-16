import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import {
  listarColaboradoresPorUnidadeSetor,
  listarLideresConfigPorUnidadeSetor,
  listarSetoresLideradosPor,
} from '@/lib/lideres-por-setor';
import {
  buildMapaAvaliacaoDireta,
  filtrarEquipeRespeitandoExclusividade,
  listarEquipeAvaliacaoDireta,
} from '@/lib/avaliacao-direta';
import { resolverUnidadesListaCompletaEquipeAvaliacao } from '@/lib/resolver-unidades-equipe-avaliacao';
import { deveExcluirSetorDaListaCompletaUnidade } from '@/lib/setores-fabrica-lideranca';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LiderVinculado = {
  id: string;
  nome: string;
  role: string;
};

export type MembroEquipe = {
  id: string;
  nome: string;
  role: string | null;
  cargo: string | null;
  setor: string | null;
  tipo_escala: string | null;
  onboarding_completo: boolean;
  operacao_apto: boolean;
};

async function enriquecerMembrosEquipe(
  supabase: SupabaseAdmin,
  membros: MembroEquipe[]
): Promise<MembroEquipe[]> {
  if (membros.length === 0) return [];
  const ids = membros.map((m) => m.id);
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto')
    .in('id', ids)
    .order('nome', { ascending: true });
  if (error) throw new Error(error.message);
  const byId = new Map((data ?? []).map((c) => [String(c.id), c]));
  return membros
    .map((m) => {
      const row = byId.get(m.id);
      if (!row) return null;
      return {
        id: m.id,
        nome: String(row.nome ?? m.nome),
        role: (row.role as string | null) ?? m.role,
        cargo: (row.cargo as string | null) ?? m.cargo,
        setor: (row.setor as string | null) ?? m.setor,
        tipo_escala: (row as { tipo_escala?: string | null }).tipo_escala ?? null,
        onboarding_completo: Boolean(row.onboarding_completo),
        operacao_apto: (row as { operacao_apto?: boolean }).operacao_apto === true,
      };
    })
    .filter((m): m is MembroEquipe => m != null);
}

/**
 * Equipe para `/portal/avaliacao-master`:
 * gerente da loja (`unidade_todos` / `*` na unidade) → todos os colaboradores daquela unidade;
 * líder por setor (ex.: Joyce/Silvia — Fábrica de preparos; Sabrina/Henrique — doces) → só via `lideres_por_setor`.
 * Unidade Fábrica não entra na lista completa de Mesquita; setor na Fábrica não vira lista da unidade inteira.
 */
export async function listarEquipeParaAvaliacaoSemanal(
  supabase: SupabaseAdmin,
  liderId: string,
  unidadeId: string
): Promise<MembroEquipe[]> {
  const mapa = await buildMapaAvaliacaoDireta(supabase);
  const direta = await listarEquipeAvaliacaoDireta(supabase, liderId);

  const mesclarListas = (listas: MembroEquipe[][]) => {
    const porId = new Map<string, MembroEquipe>();
    for (const lista of listas) {
      for (const m of filtrarEquipeRespeitandoExclusividade(lista, liderId, mapa)) {
        porId.set(m.id, m);
      }
    }
    for (const m of direta) porId.set(m.id, m);
    return Array.from(porId.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  };

  const listas: MembroEquipe[][] = [];

  let setoresLiderados: Array<{ unidade_id: string; setor: string }> = [];
  try {
    setoresLiderados = await listarSetoresLideradosPor(supabase, liderId);
  } catch {
    setoresLiderados = [];
  }

  if (setoresLiderados.length > 0) {
    const porLideranca = await listarEquipeDoLider(supabase, liderId, null);
    listas.push(await enriquecerMembrosEquipe(supabase, porLideranca));
  }

  const unidadesListaCompleta = await resolverUnidadesListaCompletaEquipeAvaliacao(
    supabase,
    liderId,
    unidadeId
  );
  for (const uid of unidadesListaCompleta) {
    listas.push(await listarColaboradoresUnidadeParaAvaliacaoGerente(supabase, uid, liderId));
  }

  if (listas.length === 0 && direta.length === 0) {
    listas.push(await listarColaboradoresUnidadeParaAvaliacaoGerente(supabase, unidadeId, liderId));
  }

  return mesclarListas(listas);
}

/** Avaliação semanal do gerente: todos os colaboradores da unidade (independente do onboarding). */
export async function listarColaboradoresUnidadeParaAvaliacaoGerente(
  supabase: SupabaseAdmin,
  unidadeId: string,
  excluirAvaliadorId?: string
): Promise<MembroEquipe[]> {
  let query = supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto')
    .eq('unidade_id', unidadeId)
    .order('nome', { ascending: true });

  if (excluirAvaliadorId) {
    query = query.neq('id', excluirAvaliadorId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const { data: unidadeRow } = await supabase
    .from('unidades')
    .select('slug')
    .eq('id', unidadeId)
    .maybeSingle();
  const unidadeSlug = unidadeRow?.slug ? String(unidadeRow.slug) : null;

  return (data ?? [])
    .filter((c) => {
      if (normalizePortalRole((c as { role?: string }).role) !== 'colaborador') return false;
      if (deveExcluirSetorDaListaCompletaUnidade(unidadeSlug, (c as { setor?: string | null }).setor)) {
        return false;
      }
      return true;
    })
    .map((c) => ({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      role: (c as { role?: string | null }).role ?? null,
      cargo: (c as { cargo?: string | null }).cargo ?? null,
      setor: (c as { setor?: string | null }).setor ?? null,
      tipo_escala: (c as { tipo_escala?: string | null }).tipo_escala ?? null,
      onboarding_completo: Boolean((c as { onboarding_completo?: boolean }).onboarding_completo),
      operacao_apto: (c as { operacao_apto?: boolean }).operacao_apto === true,
    }));
}

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
      .select('id, nome, role, cargo, setor, unidade_id, tipo_escala, onboarding_completo, operacao_apto')
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
        tipo_escala: (c as { tipo_escala?: string | null }).tipo_escala ?? null,
        onboarding_completo: Boolean((c as { onboarding_completo?: boolean }).onboarding_completo),
        operacao_apto: (c as { operacao_apto?: boolean }).operacao_apto === true,
      });
    }
  }

  const mapa = await buildMapaAvaliacaoDireta(supabase);
  return filtrarEquipeRespeitandoExclusividade(
    Array.from(porId.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    liderId,
    mapa
  );
}

/** Líderes diretos por colaborador (config unidade/setor + vínculos + `lider_id`). */
export async function carregarLiderIdsPorColaboradores(
  supabase: SupabaseAdmin,
  colaboradorIds: string[]
): Promise<Record<string, Set<string>>> {
  const out: Record<string, Set<string>> = {};
  const ids = Array.from(new Set(colaboradorIds.map(String).filter(Boolean)));
  for (const id of ids) out[id] = new Set();

  if (ids.length === 0) return out;

  const { data: cols, error: errCol } = await supabase
    .from('colaboradores')
    .select('id, lider_id, unidade_id, setor')
    .in('id', ids);

  if (errCol) throw new Error(errCol.message);

  for (const c of cols ?? []) {
    const cid = String(c.id);
    const lid = c.lider_id ? String(c.lider_id) : '';
    if (lid && lid !== cid) out[cid].add(lid);
  }

  const { data: vinculos } = await supabase
    .from('colaboradores_lideres')
    .select('colaborador_id, lider_id')
    .in('colaborador_id', ids)
    .eq('ativo', true);

  for (const v of vinculos ?? []) {
    const cid = String(v.colaborador_id);
    const lid = String(v.lider_id ?? '');
    if (lid && lid !== cid) out[cid]?.add(lid);
  }

  const pares = new Map<string, { unidade_id: string; setor: string }>();
  for (const c of cols ?? []) {
    const uid = c.unidade_id ? String(c.unidade_id) : '';
    const setor = String(c.setor ?? '').trim();
    if (!uid) continue;
    pares.set(`${uid}|${setor}`, { unidade_id: uid, setor });
  }

  const lideresConfigPorPar = new Map<string, string[]>();
  for (const { unidade_id, setor } of Array.from(pares.values())) {
    const key = `${unidade_id}|${setor}`;
    if (lideresConfigPorPar.has(key)) continue;
    const lideres = await listarLideresConfigPorUnidadeSetor(supabase, unidade_id, setor);
    lideresConfigPorPar.set(
      key,
      lideres.map((l) => String(l.id))
    );
  }

  for (const c of cols ?? []) {
    const cid = String(c.id);
    const uid = c.unidade_id ? String(c.unidade_id) : '';
    const setor = String(c.setor ?? '').trim();
    if (!uid) continue;
    const key = `${uid}|${setor}`;
    for (const lid of lideresConfigPorPar.get(key) ?? []) {
      if (lid && lid !== cid) out[cid].add(lid);
    }
  }

  return out;
}
