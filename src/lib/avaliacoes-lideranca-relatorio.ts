import type { createAdminClient } from '@/lib/supabase/admin';
import {
  podeAuditarAutorAvaliacaoLideranca,
  relatorioRestringeUnidade,
} from '@/lib/avaliacoes-relatorio-access';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LinhaLiderancaRelatorio = {
  id: string;
  unidade_id: string;
  filial_nome: string;
  filial_slug: string;
  semana_inicio: string;
  created_at: string;
  avaliado_nome: string;
  avaliado_setor: string | null;
  avaliado_id: string;
  avaliador_label: string;
  avaliador_id: string;
  /** Preenchido só na resposta para sócios (auditoria). */
  avaliador_anonimo?: boolean;
  avaliador_setor?: string | null;
  n_exemplo: number;
  n_comunicacao: number;
  n_suporte: number;
  n_justica: number;
  n_clima: number;
  justificativa_nota_baixa: string | null;
  media: number;
};

type RowLider = Record<string, unknown>;

/** Rótulo de auditoria sócio: identifica quem avaliou e se marcou anônimo. */
function labelAvaliadorSocio(nome: string, anonimo: boolean): string {
  const n = nome.trim() || 'Colaborador';
  return anonimo ? `${n} avaliou, de forma anônima` : `${n} avaliou`;
}

function mapNotas(r: RowLider) {
  const nExemplo = Number(r.n_exemplo ?? r.n_organizacao ?? 3);
  const nComunicacao = Number(r.n_comunicacao ?? r.n_fala_escuta ?? 3);
  const nSuporte = Number(r.n_suporte ?? r.n_apoio ?? 3);
  const nJustica = Number(r.n_justica ?? r.n_organizacao ?? 3);
  const nClima = Number(r.n_clima ?? r.n_ambiente ?? 3);
  const media = (nExemplo + nComunicacao + nSuporte + nJustica + nClima) / 5;
  return { nExemplo, nComunicacao, nSuporte, nJustica, nClima, media };
}

async function fetchRows(
  supabase: SupabaseAdmin,
  opts: {
    unidadeIdFilter: string | null;
    inicio: string | null;
    fim: string | null;
    limite: number;
  }
): Promise<{ rows: RowLider[]; error: string | null }> {
  const selectNovo =
    'id, unidade_id, semana_inicio, anonimo, n_exemplo, n_comunicacao, n_suporte, n_justica, n_clima, justificativa_nota_baixa, created_at, avaliado_id, avaliador_id';
  const selectLegado =
    'id, unidade_id, semana_inicio, anonimo, n_fala_escuta, n_apoio, n_ambiente, n_organizacao, justificativa_nota_baixa, created_at, avaliado_id, avaliador_id';

  const build = (cols: string) => {
    let q = supabase
      .from('avaliacoes_lideranca')
      .select(cols)
      .order('semana_inicio', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(opts.limite);
    if (opts.unidadeIdFilter) q = q.eq('unidade_id', opts.unidadeIdFilter);
    if (opts.inicio && /^\d{4}-\d{2}-\d{2}$/.test(opts.inicio)) {
      q = q.gte('semana_inicio', opts.inicio);
    }
    if (opts.fim && /^\d{4}-\d{2}-\d{2}$/.test(opts.fim)) {
      q = q.lte('semana_inicio', opts.fim);
    }
    return q;
  };

  let res = await build(selectNovo);
  if (res.error && /column .*n_exemplo.*does not exist/i.test(res.error.message)) {
    res = await build(selectLegado);
  }
  if (res.error) return { rows: [], error: res.error.message };
  return { rows: (res.data ?? []) as unknown as RowLider[], error: null };
}

export async function listarAvaliacoesLiderancaRelatorio(
  supabase: SupabaseAdmin,
  opts: {
    viewerColaboradorId: string;
    viewerRole: string;
    unidadeSlug?: string | null;
    inicio?: string | null;
    fim?: string | null;
    limite?: number;
  }
): Promise<{ itens: LinhaLiderancaRelatorio[]; nota: string; auditoria_socio: boolean; erro?: string }> {
  const role = normalizePortalRole(opts.viewerRole);
  const limite = Math.min(5000, Math.max(50, opts.limite ?? 2000));
  const inicio = opts.inicio?.trim() || null;
  const fim = opts.fim?.trim() || null;
  const auditoriaSocio = podeAuditarAutorAvaliacaoLideranca(role);

  let unidadeIdFilter: string | null = null;
  if (relatorioRestringeUnidade(role)) {
    const { data: eu } = await supabase
      .from('colaboradores')
      .select('unidade_id')
      .eq('id', opts.viewerColaboradorId)
      .maybeSingle();
    unidadeIdFilter = eu?.unidade_id ? String(eu.unidade_id) : null;
  } else if (opts.unidadeSlug) {
    const { data: u } = await supabase
      .from('unidades')
      .select('id')
      .eq('slug', opts.unidadeSlug)
      .maybeSingle();
    if (!u?.id) {
      return { itens: [], nota: '', auditoria_socio: auditoriaSocio, erro: 'Unidade não encontrada' };
    }
    unidadeIdFilter = String(u.id);
  }

  const { rows, error } = await fetchRows(supabase, { unidadeIdFilter, inicio, fim, limite });
  if (error) return { itens: [], nota: '', auditoria_socio: auditoriaSocio, erro: error };

  const uids = Array.from(new Set(rows.map((r) => r.unidade_id as string).filter(Boolean)));
  let unidadeMeta: Record<string, { nome: string; slug: string }> = {};
  if (uids.length > 0) {
    const { data: uns } = await supabase.from('unidades').select('id, nome, slug').in('id', uids);
    unidadeMeta = Object.fromEntries(
      (uns ?? []).map((x) => [
        x.id as string,
        { nome: String(x.nome ?? ''), slug: String(x.slug ?? '') },
      ])
    );
  }

  const ids = Array.from(
    new Set(rows.flatMap((r) => [r.avaliado_id, r.avaliador_id].filter(Boolean) as string[]))
  );
  const metaPorId: Record<string, { nome: string; setor: string | null }> = {};
  if (ids.length > 0) {
    const { data: pessoas } = await supabase.from('colaboradores').select('id, nome, setor').in('id', ids);
    for (const p of pessoas ?? []) {
      metaPorId[p.id as string] = {
        nome: String(p.nome ?? ''),
        setor: (p as { setor?: string | null }).setor ?? null,
      };
    }
  }

  const itens = rows.map((r) => {
    const uid = String(r.unidade_id ?? '');
    const meta = unidadeMeta[uid];
    const { nExemplo, nComunicacao, nSuporte, nJustica, nClima, media } = mapNotas(r);
    const avaliadoId = String(r.avaliado_id ?? '');
    const avaliadorId = String(r.avaliador_id ?? '');
    const avaliadoMeta = metaPorId[avaliadoId];
    const avaliadorMeta = metaPorId[avaliadorId];
    const marcadoAnonimo = r.anonimo === true || r.anonimo === 'true';

    let avaliador_label: string;
    let avaliador_id_out: string;
    let avaliador_anonimo: boolean | undefined;
    let avaliador_setor: string | null | undefined;

    if (auditoriaSocio) {
      const nomeAutor = avaliadorMeta?.nome?.trim() || 'Colaborador';
      avaliador_label = labelAvaliadorSocio(nomeAutor, marcadoAnonimo);
      avaliador_id_out = avaliadorId;
      avaliador_anonimo = marcadoAnonimo;
      avaliador_setor = avaliadorMeta?.setor ?? null;
    } else {
      avaliador_label = 'Colaborador (anônimo)';
      avaliador_id_out = '';
      avaliador_anonimo = undefined;
      avaliador_setor = undefined;
    }

    return {
      id: String(r.id),
      unidade_id: uid,
      filial_nome: meta?.nome ?? '—',
      filial_slug: meta?.slug ?? '',
      semana_inicio: String(r.semana_inicio ?? ''),
      created_at: String(r.created_at ?? ''),
      avaliado_nome: avaliadoMeta?.nome ?? '—',
      avaliado_setor: avaliadoMeta?.setor ?? null,
      avaliado_id: avaliadoId,
      avaliador_label,
      avaliador_id: avaliador_id_out,
      avaliador_anonimo,
      avaliador_setor,
      n_exemplo: nExemplo,
      n_comunicacao: nComunicacao,
      n_suporte: nSuporte,
      n_justica: nJustica,
      n_clima: nClima,
      justificativa_nota_baixa: (r.justificativa_nota_baixa as string | null) ?? null,
      media: Math.round(media * 100) / 100,
    };
  });

  const nota = auditoriaSocio
    ? 'Visão exclusiva de sócio: aparece quem avaliou cada líder — com ou sem «de forma anônima». Ninguém mais no portal vê estes nomes.'
    : 'Feedback dos colaboradores sobre a liderança. Avaliador anônimo nesta visão. Filtro por semana de referência (segunda-feira).';

  return { itens, nota, auditoria_socio: auditoriaSocio };
}
