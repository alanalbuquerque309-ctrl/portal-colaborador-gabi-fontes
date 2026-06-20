import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PortalHomeCriterio,
  PortalHomePainel,
  PortalHomeRankingEscopo,
  PortalHomeTrofeuRecebido,
} from '@/lib/portal-home-types';
import {
  agruparMediasPorColaborador,
  AVALIACAO_RANKING_MIN_SEMANAS,
  inicioDataReferenciaRanking,
  mediaMensalColaborador,
  topTresComEmpateNoTerceiro,
  type ScoreMensal,
} from '@/lib/avaliacao-ranking';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { fraseMotivacionalDesempenho } from '@/lib/frases-motivacao-desempenho';
import { slugsDoGrupoMural, rotuloGrupoMural } from '@/lib/mural-unidade-grupo';
import { calcularSaldoGraos } from '@/lib/graos/movimentos';
import { nivelGraosPorTotal } from '@/lib/graos/nivel';
import { metaTrofeuPar } from '@/lib/trofeus-pares';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';

function mesBoundsUTC(ano: number, mes: number): { ini: string; fim: string; mesRef: string } {
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${ano}-${String(mes).padStart(2, '0')}` };
}

function mesAtualUTC(): { ano: number; mes: number } {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

async function idsUnidadesPorSlugs(supabase: SupabaseClient, slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data } = await supabase.from('unidades').select('id, slug').in('slug', slugs);
  return (data ?? []).map((u) => String(u.id));
}

function posicaoNoRanking(scored: ScoreMensal[], meuId: string): { posicao: number | null; total: number } {
  const eligible = scored.filter((s) => s.dias >= AVALIACAO_RANKING_MIN_SEMANAS);
  eligible.sort((a, b) => b.media - a.media || a.nome.localeCompare(b.nome, 'pt-BR'));
  const idx = eligible.findIndex((s) => s.id === meuId);
  return { posicao: idx >= 0 ? idx + 1 : null, total: eligible.length };
}

async function calcularRankingEscopo(
  supabase: SupabaseClient,
  opts: {
    colaboradorId: string;
    unidadeIds: string[] | null;
    ini: string;
    fim: string;
    label: string;
  }
): Promise<PortalHomeRankingEscopo> {
  let query = supabase
    .from('colaboradores')
    .select('id, nome')
    .eq('role', 'colaborador');

  if (opts.unidadeIds && opts.unidadeIds.length > 0) {
    query = query.in('unidade_id', opts.unidadeIds);
  }

  const { data: colegas } = await query;
  const ids = (colegas ?? []).map((c) => String(c.id));
  const nomePorId = Object.fromEntries((colegas ?? []).map((c) => [String(c.id), String(c.nome ?? '')]));

  if (ids.length === 0) {
    return {
      posicao: null,
      total: 0,
      media: null,
      semanas_avaliadas: 0,
      no_top3: false,
      label_escopo: opts.label,
      top3: [],
    };
  }

  const refMin = inicioDataReferenciaRanking(opts.ini);

  const { data: linhas } = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, avaliador_id, media_dia, data_referencia, created_at, ignorada')
    .in('colaborador_id', ids)
    .gte('data_referencia', refMin)
    .lte('data_referencia', opts.fim);

  const linhasMapeadas = filtrarAvaliacoesParaMedia(
    (linhas ?? []).map((row) => ({
      colaborador_id: String(row.colaborador_id),
      avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
      data_referencia: String(row.data_referencia),
      media_dia: row.media_dia as number | null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      ignorada: (row as { ignorada?: boolean }).ignorada,
    }))
  );

  const ctxRanking = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);
  const porColab = agruparMediasPorColaborador(linhasMapeadas, ids, opts.ini, ctxRanking, opts.fim);

  const scored: ScoreMensal[] = ids.map((id) => {
    const { media, dias } = mediaMensalColaborador(porColab[id] ?? []);
    return { id, nome: nomePorId[id] || '—', media: media ?? 0, dias };
  });

  const top3 = topTresComEmpateNoTerceiro(scored);
  const top3Ids = new Set(top3.map((t) => t.id));
  const { posicao, total } = posicaoNoRanking(scored, opts.colaboradorId);
  const aggEu = mediaMensalColaborador(porColab[opts.colaboradorId] ?? []);

  return {
    posicao,
    total,
    media: aggEu.media,
    semanas_avaliadas: aggEu.dias,
    no_top3: top3Ids.has(opts.colaboradorId),
    label_escopo: opts.label,
    top3: top3.map((t) => ({ nome: t.nome, media: t.media })),
  };
}

const CRITERIOS_KEYS = [
  { key: 'nota_pontualidade', id: 'pontualidade', label: 'Pontualidade' },
  { key: 'nota_trabalho_equipe', id: 'equipe', label: 'Trabalho em equipe' },
  { key: 'nota_desempenho_tarefas', id: 'desempenho', label: 'Desempenho' },
  { key: 'nota_proatividade', id: 'proatividade', label: 'Proatividade' },
  { key: 'nota_vestimenta', id: 'vestimenta', label: 'Vestimenta' },
] as const;

async function mediasCriteriosColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanasAtras = 12
): Promise<PortalHomeCriterio[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - semanasAtras * 7);
  const desdeIso = desde.toISOString().slice(0, 10);

  const selectCols =
    'assiduidade, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, nota_vestimenta, ignorada, data_referencia';

  const { data: rows } = await supabase
    .from('avaliacoes_diarias')
    .select(selectCols)
    .eq('colaborador_id', colaboradorId)
    .gte('data_referencia', desdeIso)
    .order('data_referencia', { ascending: false })
    .limit(80);

  const presentes = (rows ?? []).filter((r) => {
    if ((r as { ignorada?: boolean }).ignorada === true) return false;
    const ass = assiduidadeDoBanco(String((r as { assiduidade?: string }).assiduidade ?? ''));
    return ass === 'presente' || ass === 'outra_escala';
  });

  return CRITERIOS_KEYS.map(({ key, id, label }) => {
    const vals: number[] = [];
    for (const r of presentes) {
      const raw = (r as Record<string, unknown>)[key];
      const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN;
      if (!Number.isNaN(n) && n >= 1 && n <= 5) vals.push(n);
    }
    if (vals.length === 0) {
      return { id, label, media: null, percentual: null };
    }
    const media = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    return {
      id,
      label,
      media,
      percentual: Math.round((media / 5) * 100),
    };
  });
}

export async function montarPainelPessoalColaborador(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<PortalHomePainel | null> {
  const { data: eu, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, unidade_id, unidades(slug)')
    .eq('id', colaboradorId)
    .maybeSingle();

  if (error || !eu) return null;
  if (String((eu as { role?: string }).role ?? '').toLowerCase() !== 'colaborador') return null;

  const nome = String((eu as { nome?: string }).nome ?? '');
  const primeiro = nome.trim().split(/\s+/)[0] || nome;
  const unidadeEmbed = (eu as { unidades?: { slug?: string } | { slug?: string }[] | null }).unidades;
  const unidadeSlug = Array.isArray(unidadeEmbed) ? unidadeEmbed[0]?.slug : unidadeEmbed?.slug;
  const slugsGrupo = slugsDoGrupoMural(unidadeSlug ?? '');

  const { ano, mes } = mesAtualUTC();
  const { ini, fim, mesRef } = mesBoundsUTC(ano, mes);

  const unidadeIdsGrupo = await idsUnidadesPorSlugs(supabase, slugsGrupo);

  const [rankingUnidade, rankingGeral, criterios, saldoGraos, trofeusRaw] = await Promise.all([
    calcularRankingEscopo(supabase, {
      colaboradorId,
      unidadeIds: unidadeIdsGrupo,
      ini,
      fim,
      label: rotuloGrupoMural(unidadeSlug),
    }),
    calcularRankingEscopo(supabase, {
      colaboradorId,
      unidadeIds: null,
      ini,
      fim,
      label: 'Geral',
    }),
    mediasCriteriosColaborador(supabase, colaboradorId),
    calcularSaldoGraos(supabase, colaboradorId),
    supabase
      .from('trofeus_entre_pares')
      .select('id, tipo, created_at, avaliador_id')
      .eq('destinatario_id', colaboradorId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const mediaMes = rankingUnidade.media ?? rankingGeral.media;
  const nivel = nivelGraosPorTotal(saldoGraos.total_ganho_confirmado);

  const avaliadorIds = new Set<string>();
  for (const t of trofeusRaw.data ?? []) {
    if (t.avaliador_id) avaliadorIds.add(String(t.avaliador_id));
  }
  const nomeAvaliador: Record<string, string> = {};
  if (avaliadorIds.size > 0) {
    const { data: nomes } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .in('id', Array.from(avaliadorIds));
    for (const n of nomes ?? []) {
      nomeAvaliador[String(n.id)] = String(n.nome ?? '');
    }
  }

  const { count: totalTrofeus } = await supabase
    .from('trofeus_entre_pares')
    .select('id', { count: 'exact', head: true })
    .eq('destinatario_id', colaboradorId);

  const ultimos: PortalHomeTrofeuRecebido[] = (trofeusRaw.data ?? []).map((t) => {
    const tipo = String(t.tipo ?? '');
    const meta = metaTrofeuPar(tipo);
    const aid = String(t.avaliador_id ?? '');
    const primeiroAval = (nomeAvaliador[aid] ?? '').trim().split(/\s+/)[0] || 'Colega';
    return {
      id: String(t.id),
      tipo,
      titulo: meta?.titulo ?? tipo,
      emoji: meta?.emoji ?? '🏅',
      avaliador_nome: primeiroAval,
      created_at: String(t.created_at ?? ''),
    };
  });

  return {
    primeiro_nome: primeiro,
    media_mes: mediaMes,
    semanas_avaliadas: rankingUnidade.semanas_avaliadas || rankingGeral.semanas_avaliadas,
    mes_referencia: mesRef,
    frase_motivacional: fraseMotivacionalDesempenho(mediaMes),
    criterios,
    ranking_unidade: rankingUnidade,
    ranking_geral: rankingGeral,
    graos: {
      saldo_confirmado: saldoGraos.confirmado,
      saldo_pendente: saldoGraos.pendente,
      nivel_emoji: nivel.emoji,
      nivel_label: nivel.label,
    },
    trofeus: {
      total_recebidos: totalTrofeus ?? ultimos.length,
      ultimos,
    },
  };
}
