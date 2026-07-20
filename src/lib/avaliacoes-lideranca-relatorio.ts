import type { createAdminClient } from '@/lib/supabase/admin';
import {
  relatorioRestringeUnidade,
} from '@/lib/avaliacoes-relatorio-access';
import { viewerTemAuditoriaLideranca, normalizarCpfAuditoria } from '@/lib/auditoria-lideranca-viewer';
import { construirConjuntoIdsRh } from '@/lib/avaliacao-semanal-agregacao';
import { isAvaliacaoDeVisitaRh } from '@/lib/avaliacao-rh-visita-access';
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
  /** Avaliação da Visita RH (avaliacoes_diarias), não o formulário de pilares da equipe. */
  origem_visita_rh?: boolean;
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

function pickNota(n: unknown, fallback: number): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/** Mapeia notas da Visita RH (desempenho semanal) para os 5 pilares do relatório de liderança. */
function mapNotasVisitaRh(r: RowLider) {
  const mediaBruta = Number(r.media_dia);
  const fallback = Number.isFinite(mediaBruta) ? mediaBruta : 3;
  const nExemplo = pickNota(r.nota_desempenho_tarefas, fallback);
  const nComunicacao = pickNota(r.nota_trabalho_equipe, fallback);
  const nSuporte = pickNota(r.nota_proatividade, fallback);
  const nJustica = pickNota(r.nota_pontualidade, fallback);
  const nClima = pickNota(r.nota_vestimenta, fallback);
  const media = Number.isFinite(mediaBruta)
    ? mediaBruta
    : (nExemplo + nComunicacao + nSuporte + nJustica + nClima) / 5;
  return { nExemplo, nComunicacao, nSuporte, nJustica, nClima, media };
}

async function listarIdsLideresAlvo(
  supabase: SupabaseAdmin,
  avaliadoIdsDasLinhas: string[],
  unidadeIdFilter: string | null
): Promise<string[]> {
  const ids = new Set(avaliadoIdsDasLinhas.filter(Boolean));

  let qLideres = supabase
    .from('colaboradores')
    .select('id, role')
    .in('role', ['gerente', 'master', 'admin']);
  if (unidadeIdFilter) qLideres = qLideres.eq('unidade_id', unidadeIdFilter);
  const { data: porRole } = await qLideres;
  for (const c of porRole ?? []) ids.add(String((c as { id: string }).id));

  let qSetor = supabase.from('lideres_por_setor').select('lider_id').eq('ativo', true);
  if (unidadeIdFilter) qSetor = qSetor.eq('unidade_id', unidadeIdFilter);
  const { data: porSetor } = await qSetor;
  for (const r of porSetor ?? []) {
    if (r?.lider_id) ids.add(String(r.lider_id));
  }

  return Array.from(ids);
}

async function fetchVisitasRhSobreLideres(
  supabase: SupabaseAdmin,
  opts: {
    liderIds: string[];
    unidadeIdFilter: string | null;
    inicio: string | null;
    fim: string | null;
    limite: number;
  }
): Promise<RowLider[]> {
  if (opts.liderIds.length === 0) return [];

  const { data: candidatosRh } = await supabase
    .from('colaboradores')
    .select('id, role, setor, nome');
  const rhIds = construirConjuntoIdsRh(
    (candidatosRh ?? []).map((c) => ({
      id: String((c as { id: string }).id),
      role: (c as { role?: string | null }).role,
      setor: (c as { setor?: string | null }).setor,
      nome: (c as { nome?: string | null }).nome,
    }))
  );
  if (rhIds.size === 0) return [];

  let q = supabase
    .from('avaliacoes_diarias')
    .select(
      'id, colaborador_id, avaliador_id, data_referencia, media_dia, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, justificativa_nota_baixa, created_at, ignorada'
    )
    .in('colaborador_id', opts.liderIds)
    .in('avaliador_id', Array.from(rhIds))
    .order('data_referencia', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(opts.limite);

  if (opts.inicio && /^\d{4}-\d{2}-\d{2}$/.test(opts.inicio)) {
    q = q.gte('data_referencia', opts.inicio);
  }
  if (opts.fim && /^\d{4}-\d{2}-\d{2}$/.test(opts.fim)) {
    q = q.lte('data_referencia', opts.fim);
  }

  const { data, error } = await q;
  if (error) {
    // Coluna ignorada pode não existir em bases antigas.
    if (/ignorada/i.test(error.message)) {
      let q2 = supabase
        .from('avaliacoes_diarias')
        .select(
          'id, colaborador_id, avaliador_id, data_referencia, media_dia, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, justificativa_nota_baixa, created_at'
        )
        .in('colaborador_id', opts.liderIds)
        .in('avaliador_id', Array.from(rhIds))
        .order('data_referencia', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(opts.limite);
      if (opts.inicio && /^\d{4}-\d{2}-\d{2}$/.test(opts.inicio)) {
        q2 = q2.gte('data_referencia', opts.inicio);
      }
      if (opts.fim && /^\d{4}-\d{2}-\d{2}$/.test(opts.fim)) {
        q2 = q2.lte('data_referencia', opts.fim);
      }
      const r2 = await q2;
      if (r2.error) return [];
      return (r2.data ?? []) as unknown as RowLider[];
    }
    return [];
  }

  return ((data ?? []) as unknown as RowLider[]).filter((r) => r.ignorada !== true);
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
    viewerNome?: string | null;
    viewerCpf?: string | null;
    viewerRoleCookie?: string | null;
    unidadeSlug?: string | null;
    inicio?: string | null;
    fim?: string | null;
    limite?: number;
  }
): Promise<{
  itens: LinhaLiderancaRelatorio[];
  nota: string;
  auditoria_socio: boolean;
  viewer_role: string;
  erro?: string;
}> {
  const role = normalizePortalRole(opts.viewerRole);
  const limite = Math.min(5000, Math.max(50, opts.limite ?? 2000));
  const inicio = opts.inicio?.trim() || null;
  const fim = opts.fim?.trim() || null;

  let viewerNome = opts.viewerNome?.trim() || null;
  let viewerCpf = normalizarCpfAuditoria(opts.viewerCpf) || null;
  let unidadeIdFilter: string | null = null;

  if (opts.viewerColaboradorId && opts.viewerColaboradorId !== 'admin-panel') {
    const { data: eu } = await supabase
      .from('colaboradores')
      .select('unidade_id, nome, cpf')
      .eq('id', opts.viewerColaboradorId)
      .maybeSingle();
    if (!viewerNome && eu?.nome) viewerNome = String(eu.nome);
    if (!viewerCpf && (eu as { cpf?: string | null })?.cpf) {
      viewerCpf = normalizarCpfAuditoria((eu as { cpf?: string | null }).cpf) || null;
    }
    if (relatorioRestringeUnidade(role)) {
      unidadeIdFilter = eu?.unidade_id ? String(eu.unidade_id) : null;
    }
  }

  const auditoriaSocio = viewerTemAuditoriaLideranca({
    colaboradorId: opts.viewerColaboradorId,
    roleDb: role,
    roleCookie: opts.viewerRoleCookie,
    nome: viewerNome,
    cpf: viewerCpf,
  });

  if (!unidadeIdFilter && opts.unidadeSlug) {
    const { data: u } = await supabase
      .from('unidades')
      .select('id')
      .eq('slug', opts.unidadeSlug)
      .maybeSingle();
    if (!u?.id) {
      return {
        itens: [],
        nota: '',
        auditoria_socio: auditoriaSocio,
        viewer_role: role,
        erro: 'Unidade não encontrada',
      };
    }
    unidadeIdFilter = String(u.id);
  }

  const { rows, error } = await fetchRows(supabase, { unidadeIdFilter, inicio, fim, limite });
  if (error) {
    return { itens: [], nota: '', auditoria_socio: auditoriaSocio, viewer_role: role, erro: error };
  }

  const liderIds = await listarIdsLideresAlvo(
    supabase,
    rows.map((r) => String(r.avaliado_id ?? '')).filter(Boolean),
    unidadeIdFilter
  );
  const visitasRh = await fetchVisitasRhSobreLideres(supabase, {
    liderIds,
    unidadeIdFilter,
    inicio,
    fim,
    limite: Math.min(2000, limite),
  });

  // Unidade dos líderes avaliados pela RH (avaliacoes_diarias não traz unidade_id).
  const idsPessoasRh = Array.from(
    new Set(
      visitasRh.flatMap((r) =>
        [r.colaborador_id, r.avaliador_id].filter(Boolean).map((x) => String(x))
      )
    )
  );
  const unidadePorColab: Record<string, string> = {};
  if (idsPessoasRh.length > 0) {
    const { data: colsUn } = await supabase
      .from('colaboradores')
      .select('id, unidade_id')
      .in('id', idsPessoasRh);
    for (const c of colsUn ?? []) {
      if (c?.unidade_id) unidadePorColab[String(c.id)] = String(c.unidade_id);
    }
  }

  const uids = Array.from(
    new Set([
      ...rows.map((r) => r.unidade_id as string).filter(Boolean),
      ...Object.values(unidadePorColab),
    ])
  );
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
    new Set([
      ...rows.flatMap((r) => [r.avaliado_id, r.avaliador_id].filter(Boolean) as string[]),
      ...visitasRh.flatMap((r) => [r.colaborador_id, r.avaliador_id].filter(Boolean) as string[]),
    ])
  );
  const metaPorId: Record<string, { nome: string; setor: string | null; role: string | null }> = {};
  if (ids.length > 0) {
    const { data: pessoas } = await supabase
      .from('colaboradores')
      .select('id, nome, setor, role')
      .in('id', ids);
    for (const p of pessoas ?? []) {
      metaPorId[p.id as string] = {
        nome: String(p.nome ?? ''),
        setor: (p as { setor?: string | null }).setor ?? null,
        role: (p as { role?: string | null }).role ?? null,
      };
    }
  }

  const rhIds = construirConjuntoIdsRh(
    Object.entries(metaPorId).map(([id, m]) => ({
      id,
      role: m.role,
      setor: m.setor,
      nome: m.nome,
    }))
  );

  const itensEquipe = rows.map((r): LinhaLiderancaRelatorio => {
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
      origem_visita_rh: false,
      n_exemplo: nExemplo,
      n_comunicacao: nComunicacao,
      n_suporte: nSuporte,
      n_justica: nJustica,
      n_clima: nClima,
      justificativa_nota_baixa: (r.justificativa_nota_baixa as string | null) ?? null,
      media: Math.round(media * 100) / 100,
    };
  });

  const itensRh = visitasRh
    .filter((r) => {
      const avaliadorId = String(r.avaliador_id ?? '');
      const roleAv = metaPorId[avaliadorId]?.role ?? null;
      return isAvaliacaoDeVisitaRh(avaliadorId, roleAv, rhIds);
    })
    .map((r): LinhaLiderancaRelatorio => {
      const avaliadoId = String(r.colaborador_id ?? '');
      const avaliadorId = String(r.avaliador_id ?? '');
      const uid = unidadePorColab[avaliadoId] || unidadePorColab[avaliadorId] || '';
      const meta = unidadeMeta[uid];
      const { nExemplo, nComunicacao, nSuporte, nJustica, nClima, media } = mapNotasVisitaRh(r);
      const avaliadoMeta = metaPorId[avaliadoId];
      const avaliadorMeta = metaPorId[avaliadorId];
      const nomeRh = avaliadorMeta?.nome?.trim() || 'RH';
      const just = (r.justificativa_nota_baixa as string | null)?.trim() || null;
      const justComOrigem = just
        ? `Visita RH — ${just}`
        : 'Visita RH (avaliação semanal de desempenho).';

      return {
        id: `rh-${String(r.id)}`,
        unidade_id: uid,
        filial_nome: meta?.nome ?? '—',
        filial_slug: meta?.slug ?? '',
        semana_inicio: String(r.data_referencia ?? ''),
        created_at: String(r.created_at ?? ''),
        avaliado_nome: avaliadoMeta?.nome ?? '—',
        avaliado_setor: avaliadoMeta?.setor ?? null,
        avaliado_id: avaliadoId,
        avaliador_label: `${nomeRh} (Visita RH)`,
        avaliador_id: avaliadorId,
        avaliador_anonimo: false,
        avaliador_setor: avaliadorMeta?.setor ?? 'RH',
        origem_visita_rh: true,
        n_exemplo: nExemplo,
        n_comunicacao: nComunicacao,
        n_suporte: nSuporte,
        n_justica: nJustica,
        n_clima: nClima,
        justificativa_nota_baixa: justComOrigem,
        media: Math.round(media * 100) / 100,
      };
    })
    .filter((l) => {
      if (!unidadeIdFilter) return true;
      return l.unidade_id === unidadeIdFilter;
    });

  const itens = [...itensEquipe, ...itensRh].sort((a, b) => {
    const s = b.semana_inicio.localeCompare(a.semana_inicio);
    if (s !== 0) return s;
    return b.created_at.localeCompare(a.created_at);
  });

  const nota = auditoriaSocio
    ? 'Visão exclusiva de sócio: aparece quem avaliou cada líder (equipe e Visita RH). Avaliações anônimas da equipe vêm com o nome do autor.'
    : 'Avaliação de liderança pela equipe (anônima nesta visão) e Visita RH identificada. Filtro por semana de referência (segunda-feira).';

  return { itens, nota, auditoria_socio: auditoriaSocio, viewer_role: role };
}
