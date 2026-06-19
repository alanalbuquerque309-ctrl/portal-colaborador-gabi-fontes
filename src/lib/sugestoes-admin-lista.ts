import type { SupabaseClient } from '@supabase/supabase-js';

export type SugestaoAdminItem = {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean;
  created_at: string;
  visualizado_em: string | null;
  graos_destaque_em: string | null;
  curtidas: number;
  autor: string;
  unidade: string;
};

function colunaAusente(msg: string): boolean {
  return /does not exist|schema cache|graos_destaque|visualizado_em|curtidas/i.test(msg);
}

type RowBase = {
  id: string;
  tipo: string;
  texto: string;
  anonimo: boolean | null;
  created_at: string;
  visualizado_em?: string | null;
  graos_destaque_em?: string | null;
  curtidas?: number | null;
  colaborador_id?: string | null;
  unidade_id?: string | null;
};

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
  const nomesUnidade = new Map<string, string>();

  if (colabIds.length > 0) {
    const { data } = await supabase.from('colaboradores').select('id, nome').in('id', colabIds);
    for (const c of data ?? []) {
      nomesColab.set(String(c.id), String((c as { nome?: string }).nome ?? ''));
    }
  }

  if (unidadeIds.length > 0) {
    const { data } = await supabase.from('unidades').select('id, nome').in('id', unidadeIds);
    for (const u of data ?? []) {
      nomesUnidade.set(String(u.id), String((u as { nome?: string }).nome ?? ''));
    }
  }

  return rows.map((r) => ({
    id: String(r.id),
    tipo: String(r.tipo ?? 'sugestao'),
    texto: String(r.texto ?? ''),
    anonimo: r.anonimo === true,
    created_at: String(r.created_at ?? ''),
    visualizado_em: r.visualizado_em ?? null,
    graos_destaque_em: r.graos_destaque_em ?? null,
    curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
    autor: r.anonimo ? 'Anônimo' : nomesColab.get(String(r.colaborador_id ?? '')) || '—',
    unidade: nomesUnidade.get(String(r.unidade_id ?? '')) || '—',
  }));
}

/** Lista sugestões/reclamações para o admin, com fallback se colunas novas ainda não existirem no Supabase. */
export async function listarSugestoesAdmin(
  supabase: SupabaseClient,
  opts: {
    tipo?: 'sugestao' | 'reclamacao' | null;
    somenteSugestoes?: boolean;
    limite?: number;
  }
): Promise<{ itens: SugestaoAdminItem[]; aviso?: string }> {
  const limite = opts.limite ?? 100;
  const selects = [
    'id, tipo, texto, anonimo, created_at, visualizado_em, graos_destaque_em, curtidas, colaborador_id, unidade_id',
    'id, tipo, texto, anonimo, created_at, visualizado_em, curtidas, colaborador_id, unidade_id',
    'id, tipo, texto, anonimo, created_at, colaborador_id, unidade_id',
  ];

  let aviso: string | undefined;
  let rows: RowBase[] | null = null;
  let lastError = '';

  for (const sel of selects) {
    let query = supabase.from('sugestoes_reclamacoes').select(sel).order('created_at', { ascending: false }).limit(limite);

    if (opts.somenteSugestoes || opts.tipo === 'sugestao') {
      query = query.eq('tipo', 'sugestao');
    } else if (opts.tipo === 'reclamacao') {
      query = query.eq('tipo', 'reclamacao');
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
