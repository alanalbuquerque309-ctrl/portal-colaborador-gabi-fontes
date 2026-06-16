import type { createAdminClient } from '@/lib/supabase/admin';
import { REGRAS_AVALIACAO_DIRETA, type RegraAvaliacaoDireta } from '@/lib/config-avaliacao-direta';
import type { MembroEquipe } from '@/lib/colaborador-lideres';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type MapaAvaliacaoDireta = {
  /** alvoId → avaliadores que podem avaliá-lo por regra direta */
  avaliadoresPorAlvo: Map<string, Set<string>>;
  /** alvos que não entram na lista de outros líderes */
  alvosExclusivos: Set<string>;
};

function normalizarNome(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function nomeCoincide(cadastro: string, busca: string): boolean {
  const a = normalizarNome(cadastro);
  const b = normalizarNome(busca);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const partesB = b.split(/\s+/).filter((p) => p.length > 2);
  if (partesB.length >= 2) {
    return partesB.every((p) => a.includes(p));
  }
  return false;
}

function nomeCombinaLista(nome: string, padroes: string[]): boolean {
  return padroes.some((p) => nomeCoincide(nome, p));
}

async function listarColaboradoresAtivos(supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, unidade_id, tipo_escala, onboarding_completo, operacao_apto')
    .order('nome');
  if (error) throw new Error(error.message);
  return data ?? [];
}

function resolverIdsPorNomes(
  todos: Array<{ id: string; nome: string | null }>,
  padroes: string[]
): string[] {
  const ids = new Set<string>();
  for (const c of todos) {
    const nome = String(c.nome ?? '');
    if (nomeCombinaLista(nome, padroes)) ids.add(String(c.id));
  }
  return Array.from(ids);
}

/** Mapa em memória das regras diretas (nomes → UUID). */
export async function buildMapaAvaliacaoDireta(supabase: SupabaseAdmin): Promise<MapaAvaliacaoDireta> {
  const todos = await listarColaboradoresAtivos(supabase);
  const avaliadoresPorAlvo = new Map<string, Set<string>>();
  const alvosExclusivos = new Set<string>();

  for (const regra of REGRAS_AVALIACAO_DIRETA) {
    const avaliadores = resolverIdsPorNomes(todos, regra.avaliadores_nomes);
    const alvos = resolverIdsPorNomes(todos, regra.colaboradores_nomes);
    for (const alvoId of alvos) {
      if (regra.exclusivo) alvosExclusivos.add(alvoId);
      const set = avaliadoresPorAlvo.get(alvoId) ?? new Set<string>();
      for (const av of avaliadores) set.add(av);
      avaliadoresPorAlvo.set(alvoId, set);
    }
  }

  return { avaliadoresPorAlvo, alvosExclusivos };
}

export function avaliadorPodeVerAlvoExclusivo(
  mapa: MapaAvaliacaoDireta,
  avaliadorId: string,
  alvoId: string
): boolean {
  if (!mapa.alvosExclusivos.has(alvoId)) return true;
  const permitidos = mapa.avaliadoresPorAlvo.get(alvoId);
  return permitidos?.has(avaliadorId) ?? false;
}

export function filtrarEquipeRespeitandoExclusividade(
  membros: MembroEquipe[],
  avaliadorId: string,
  mapa: MapaAvaliacaoDireta
): MembroEquipe[] {
  return membros.filter((m) => avaliadorPodeVerAlvoExclusivo(mapa, avaliadorId, m.id));
}

function rowParaMembro(c: Record<string, unknown>): MembroEquipe {
  return {
    id: String(c.id),
    nome: String(c.nome ?? ''),
    role: (c.role as string | null) ?? null,
    cargo: (c.cargo as string | null) ?? null,
    setor: (c.setor as string | null) ?? null,
    tipo_escala: (c.tipo_escala as string | null) ?? null,
    onboarding_completo: Boolean(c.onboarding_completo),
    operacao_apto: (c as { operacao_apto?: boolean }).operacao_apto === true,
  };
}

/** Equipe só pelas regras diretas (sócia, RH, Daniel → Keila, etc.). */
export async function listarEquipeAvaliacaoDireta(
  supabase: SupabaseAdmin,
  avaliadorId: string
): Promise<MembroEquipe[]> {
  const mapa = await buildMapaAvaliacaoDireta(supabase);
  const alvoIds = new Set<string>();
  for (const [alvoId, avaliadores] of Array.from(mapa.avaliadoresPorAlvo.entries())) {
    if (avaliadores.has(avaliadorId)) alvoIds.add(alvoId);
  }
  if (alvoIds.size === 0) return [];

  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto')
    .in('id', Array.from(alvoIds))
    .neq('id', avaliadorId)
    .order('nome');
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => rowParaMembro(c as Record<string, unknown>));
}

export async function temEquipeAvaliacaoDireta(
  supabase: SupabaseAdmin,
  avaliadorId: string
): Promise<boolean> {
  const equipe = await listarEquipeAvaliacaoDireta(supabase, avaliadorId);
  return equipe.length > 0;
}

/** Materializa `colaboradores_lideres` para alvos com role colaborador. */
export async function sincronizarVinculosAvaliacaoDireta(
  supabase: SupabaseAdmin,
  regras: RegraAvaliacaoDireta[] = REGRAS_AVALIACAO_DIRETA
): Promise<{ vinculos: number; ignorados_nao_colaborador: number; vinculos_desativados: number }> {
  const todos = await listarColaboradoresAtivos(supabase);
  const agora = new Date().toISOString();
  let vinculos = 0;
  let ignorados = 0;

  for (const regra of regras) {
    const avaliadores = resolverIdsPorNomes(todos, regra.avaliadores_nomes);
    const alvos = resolverIdsPorNomes(todos, regra.colaboradores_nomes);
    for (const colaboradorId of alvos) {
      const row = todos.find((c) => String(c.id) === colaboradorId);
      const role = String((row as { role?: string })?.role ?? '').toLowerCase();
      if (role !== 'colaborador' && role !== 'gerente' && role !== 'master' && role !== 'rh' && role !== 'admin') {
        ignorados += 1;
        continue;
      }
      for (const liderId of avaliadores) {
        if (liderId === colaboradorId) continue;
        const { error } = await supabase.from('colaboradores_lideres').upsert(
          {
            colaborador_id: colaboradorId,
            lider_id: liderId,
            ativo: true,
            updated_at: agora,
          },
          { onConflict: 'colaborador_id,lider_id' }
        );
        if (!error) vinculos += 1;
      }
    }
  }

  const mapa = await buildMapaAvaliacaoDireta(supabase);
  let desativados = 0;
  for (const alvoId of Array.from(mapa.alvosExclusivos)) {
    const permitidos = mapa.avaliadoresPorAlvo.get(alvoId) ?? new Set<string>();
    const { data: vinculosAtivos } = await supabase
      .from('colaboradores_lideres')
      .select('id, lider_id')
      .eq('colaborador_id', alvoId)
      .eq('ativo', true);
    for (const v of vinculosAtivos ?? []) {
      const lid = String(v.lider_id ?? '');
      if (permitidos.has(lid)) continue;
      const { error } = await supabase
        .from('colaboradores_lideres')
        .update({ ativo: false, updated_at: agora })
        .eq('id', v.id);
      if (!error) desativados += 1;
    }
  }

  return { vinculos, ignorados_nao_colaborador: ignorados, vinculos_desativados: desativados };
}
