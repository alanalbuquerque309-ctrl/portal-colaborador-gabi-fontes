import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePortalRole } from '@/lib/roles';
import { autorElegivelGraosSugestao } from '@/lib/sugestao-resposta-graos';

export type SugestaoAdminItem = {
  id: string;
  tipo: string;
  texto: string;
  /** Legado: reclamação marcada anônima no portal (admin ainda vê o nome). */
  anonimo: boolean;
  anonimo_no_portal: boolean;
  created_at: string;
  visualizado_em: string | null;
  graos_destaque_em: string | null;
  graos_resposta_bonus: number | null;
  curtidas: number;
  autor: string;
  autor_setor: string | null;
  colaborador_id: string | null;
  autor_participa_graos: boolean;
  unidade: string;
};

function embedOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function colunaAusente(msg: string): boolean {
  return /does not exist|schema cache|graos_destaque|graos_resposta|visualizado_em|curtidas|could not embed|more than one relationship/i.test(
    msg
  );
}

type RowBase = {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean | null;
  created_at: string;
  visualizado_em?: string | null;
  graos_destaque_em?: string | null;
  graos_resposta_bonus?: number | null;
  curtidas?: number | null;
  colaborador_id?: string | null;
  unidade_id?: string | null;
  colaboradores?: { nome?: string | null; setor?: string | null } | { nome?: string | null; setor?: string | null }[] | null;
  unidades?: { nome?: string | null } | { nome?: string | null }[] | null;
};

function nomeAutorAdmin(r: RowBase, nomesColab: Map<string, string>): string {
  const col = embedOne(r.colaboradores);
  const doJoin = String(col?.nome ?? '').trim();
  if (doJoin) return doJoin;
  const cid = r.colaborador_id ? String(r.colaborador_id) : '';
  if (cid && nomesColab.has(cid)) {
    const n = nomesColab.get(cid)?.trim();
    if (n) return n;
  }
  if (cid) return 'Colaborador (nome indisponível)';
  return 'Sem autor no cadastro';
}

async function enriquecerNomes(
  supabase: SupabaseClient,
  rows: RowBase[]
): Promise<SugestaoAdminItem[]> {
  const colabIds = Array.from(
    new Set(rows.map((r) => r.colaborador_id).filter((id): id is string => Boolean(id)))
  );
  const unidadeIds = Array.from(
    new Set(rows.map((r) => r.unidade_id).filter((id): id is string => Boolean(id)))
  );

  const nomesColab = new Map<string, string>();
  const setoresColab = new Map<string, string>();
  const rolesColab = new Map<string, string>();
  const nomesUnidade = new Map<string, string>();

  if (colabIds.length > 0) {
    const { data } = await supabase.from('colaboradores').select('id, nome, setor, role').in('id', colabIds);
    for (const c of data ?? []) {
      const row = c as { id: string; nome?: string; setor?: string | null; role?: string | null };
      nomesColab.set(String(row.id), String(row.nome ?? ''));
      if (row.setor) setoresColab.set(String(row.id), String(row.setor));
      rolesColab.set(String(row.id), normalizePortalRole(row.role));
    }
  }

  if (unidadeIds.length > 0) {
    const { data } = await supabase.from('unidades').select('id, nome').in('id', unidadeIds);
    for (const u of data ?? []) {
      nomesUnidade.set(String(u.id), String((u as { nome?: string }).nome ?? ''));
    }
  }

  return rows.map((r) => {
    const col = embedOne(r.colaboradores);
    const un = embedOne(r.unidades);
    const cid = r.colaborador_id ? String(r.colaborador_id) : null;
    const anonimoPortal = r.anonimo === true && String(r.tipo ?? '') === 'reclamacao';
    return {
      id: String(r.id),
      tipo: String(r.tipo ?? 'sugestao'),
      texto: String(r.texto ?? ''),
      anonimo: anonimoPortal,
      anonimo_no_portal: anonimoPortal,
      created_at: String(r.created_at ?? ''),
      visualizado_em: r.visualizado_em ?? null,
      graos_destaque_em: r.graos_destaque_em ?? null,
      graos_resposta_bonus:
        typeof r.graos_resposta_bonus === 'number' ? r.graos_resposta_bonus : null,
      curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
      autor: nomeAutorAdmin(r, nomesColab),
      autor_setor: col?.setor ? String(col.setor) : setoresColab.get(String(cid ?? '')) ?? null,
      colaborador_id: cid,
      autor_participa_graos: autorElegivelGraosSugestao(
        cid ? rolesColab.get(cid) : undefined
      ),
      unidade:
        (un?.nome ? String(un.nome) : null) ??
        nomesUnidade.get(String(r.unidade_id ?? '')) ??
        '—',
    };
  });
}

/** Lista sugestões/reclamações para o admin, com fallback se colunas novas ainda não existirem no Supabase. */
export async function listarSugestoesAdmin(
  supabase: SupabaseClient,
  opts: {
    tipo?: 'sugestao' | 'reclamacao' | 'elogio' | null;
    somenteSugestoes?: boolean;
    limite?: number;
  }
): Promise<{ itens: SugestaoAdminItem[]; aviso?: string }> {
  const limite = opts.limite ?? 100;
  const selects = [
    'id, tipo, texto, anonimo, created_at, visualizado_em, graos_destaque_em, graos_resposta_bonus, curtidas, colaborador_id, unidade_id',
    'id, tipo, texto, anonimo, created_at, visualizado_em, graos_destaque_em, curtidas, colaborador_id, unidade_id',
    'id, tipo, texto, anonimo, created_at, colaborador_id, unidade_id',
  ];

  let aviso: string | undefined;
  let rows: RowBase[] | null = null;
  let lastError = '';

  for (const sel of selects) {
    let query = supabase.from('sugestoes_reclamacoes').select(sel).order('created_at', { ascending: false }).limit(limite);

    if (opts.somenteSugestoes) {
      query = query.neq('tipo', 'reclamacao');
    } else if (opts.tipo === 'sugestao' || opts.tipo === 'reclamacao' || opts.tipo === 'elogio') {
      query = query.eq('tipo', opts.tipo);
    }

    const { data, error } = await query;
    if (!error) {
      rows = (data ?? []) as unknown as RowBase[];
      if (sel !== selects[0]) {
        aviso = 'Algumas colunas novas ainda não existem no banco — rode a migration 045 no Supabase.';
      }
      break;
    }
    lastError = error.message;
    if (!colunaAusente(error.message)) {
      throw new Error(error.message);
    }
  }

  if (!rows) {
    throw new Error(lastError || 'Erro ao listar sugestões');
  }

  const itens = await enriquecerNomes(supabase, rows);
  return { itens, aviso };
}
