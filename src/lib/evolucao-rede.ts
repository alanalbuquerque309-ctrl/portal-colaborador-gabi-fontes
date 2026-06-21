import type { createAdminClient } from '@/lib/supabase/admin';
import {
  consolidarNotasSemanaisComReferencia,
  type AvaliacaoSemanaConsolidavel,
} from '@/lib/avaliacao-semanal-agregacao';
import { AVALIACAO_RANKING_EPOCA_INICIO } from '@/lib/avaliacao-ranking';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { UNIDADES_CADASTRO, SETORES_PREDEFINIDOS } from '@/lib/constants/colaborador-org';
import {
  agregarResumoSetor,
  agregarResumoUnidadeFromItems,
  montarResumoExecutivo,
  type ResumoExecutivoEvolucao,
  type SetorEvolucao,
} from '@/lib/evolucao-agregacao';
import {
  calcularMetricasEvolucao,
  compararCriteriosEvolucao,
  type CriterioKey,
  type MetricasEvolucao,
  type SemanaMedia,
  type SituacaoEvolucao,
  EVOLUCAO_SEMANAS_JANELA,
  labelCriterio,
} from '@/lib/evolucao';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type ColabMeta = {
  id: string;
  nome: string;
  setor: string | null;
  cargo: string | null;
  role: string | null;
  unidade_slug: string | null;
  unidade_nome: string | null;
  onboarding_completo: boolean;
};

export type ColaboradorEvolucao = {
  id: string;
  nome: string;
  setor: string | null;
  cargo: string | null;
  unidade_slug: string | null;
  unidade_nome: string | null;
  nota_atual: number | null;
  media_recente: number | null;
  delta: number | null;
  situacao: SituacaoEvolucao;
  semanas_validas: number;
  historico: SemanaMedia[];
  melhor_criterio: string | null;
  pior_criterio: string | null;
};

export type { SetorEvolucao, ResumoExecutivoEvolucao } from '@/lib/evolucao-agregacao';

export type UnidadeEvolucao = {
  slug: string;
  nome: string;
  media_atual: number | null;
  delta: number | null;
  situacao: SituacaoEvolucao;
  total: number;
  evoluindo: number;
  estavel: number;
  regredindo: number;
  sem_historico: number;
};

export type ResumoEvolucaoRede = {
  total_colaboradores: number;
  evoluindo: number;
  estavel: number;
  regredindo: number;
  sem_historico: number;
  media_rede: number | null;
  delta_rede: number | null;
  situacao_rede: SituacaoEvolucao;
};

export type PayloadEvolucaoRede = {
  gerado_em: string;
  resumo: ResumoEvolucaoRede;
  executivo: ResumoExecutivoEvolucao;
  unidades: UnidadeEvolucao[];
  setores: SetorEvolucao[];
  colaboradores: ColaboradorEvolucao[];
  ranking_atual: { id: string; nome: string; media: number; posicao: number }[];
  ranking_evolucao: { id: string; nome: string; delta: number; posicao: number }[];
};

const ROLES_EXCLUIDOS = new Set(['socio', 'admin', 'master']);

type LinhaAval = AvaliacaoSemanaConsolidavel & {
  colaborador_id: string;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  nota_proatividade?: number | null;
  ignorada?: boolean | null;
};

const SELECTS_AVALIACOES_EVOLUCAO: string[] = [
  'colaborador_id, data_referencia, media_dia, avaliador_id, created_at, ignorada, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade',
  'colaborador_id, data_referencia, media_dia, avaliador_id, created_at, ignorada, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas',
  'colaborador_id, data_referencia, media_dia, avaliador_id, created_at, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas',
  'colaborador_id, data_referencia, media_dia, avaliador_id, created_at',
];

function erroColunaAusenteEvolucao(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    /column.*not found/i.test(m)
  );
}

async function buscarAvaliacoesParaEvolucao(
  supabase: SupabaseAdmin,
  colaboradorIds: string[]
): Promise<LinhaAval[]> {
  let lastError = 'Erro ao carregar avaliações';
  for (const select of SELECTS_AVALIACOES_EVOLUCAO) {
    const { data, error } = await supabase
      .from('avaliacoes_diarias')
      .select(select)
      .gte('data_referencia', AVALIACAO_RANKING_EPOCA_INICIO)
      .in('colaborador_id', colaboradorIds);
    if (!error) return (data ?? []) as unknown as LinhaAval[];
    lastError = error.message;
    if (!erroColunaAusenteEvolucao(error.message)) break;
  }
  throw new Error(lastError);
}

function criterioValoresPorJanela(
  linhas: LinhaAval[],
  ctx: Awaited<ReturnType<typeof montarContextoConsolidacaoRanking>>,
  colaboradorId: string,
  janela: number
): { recentes: Partial<Record<CriterioKey, number[]>>; anteriores: Partial<Record<CriterioKey, number[]>> } {
  const liderIds = ctx.liderIdsPorColaborador[colaboradorId] ?? new Set<string>();
  const semanas = consolidarNotasSemanaisComReferencia(linhas, {
    liderIds,
    rhIds: ctx.rhIds,
    desde: AVALIACAO_RANKING_EPOCA_INICIO,
  });

  const refsRecentes = new Set(semanas.slice(-janela).map((s) => s.data_referencia));
  const refsAnteriores = new Set(semanas.slice(-janela * 2, -janela).map((s) => s.data_referencia));

  const recentes: Partial<Record<CriterioKey, number[]>> = {};
  const anteriores: Partial<Record<CriterioKey, number[]>> = {};

  const push = (map: Partial<Record<CriterioKey, number[]>>, key: CriterioKey, val: number | null | undefined) => {
    if (val == null || Number.isNaN(Number(val))) return;
    (map[key] ??= []).push(Number(val));
  };

  for (const l of linhas) {
    if (l.ignorada === true) continue;
    const ref = String(l.data_referencia ?? '').slice(0, 10);
    const bucket = refsRecentes.has(ref) ? recentes : refsAnteriores.has(ref) ? anteriores : null;
    if (!bucket) continue;
    push(bucket, 'vestimenta', l.nota_vestimenta);
    push(bucket, 'pontualidade', l.nota_pontualidade);
    push(bucket, 'trabalhoEquipe', l.nota_trabalho_equipe);
    push(bucket, 'desempenhoTarefas', l.nota_desempenho_tarefas);
    push(bucket, 'proatividade', l.nota_proatividade);
  }

  return { recentes, anteriores };
}

function montarResumoRede(cols: ColaboradorEvolucao[]): ResumoEvolucaoRede {
  const medias = cols
    .map((c) => c.media_recente ?? c.nota_atual)
    .filter((m): m is number => m != null);
  const media_rede =
    medias.length > 0
      ? Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 100) / 100
      : null;

  const comDelta = cols.filter((c) => c.delta != null);
  const delta_rede =
    comDelta.length > 0
      ? Math.round((comDelta.reduce((s, c) => s + (c.delta ?? 0), 0) / comDelta.length) * 100) / 100
      : null;

  const historicoRede = cols
    .flatMap((c) => c.historico)
    .reduce<SemanaMedia[]>((acc, h) => {
      const ix = acc.findIndex((x) => x.data_referencia === h.data_referencia);
      if (ix >= 0) {
        acc[ix] = {
          data_referencia: h.data_referencia,
          media: Math.round(((acc[ix]!.media + h.media) / 2) * 100) / 100,
        };
      } else acc.push({ ...h });
      return acc;
    }, [])
    .sort((a, b) => a.data_referencia.localeCompare(b.data_referencia));

  const redeMetricas = calcularMetricasEvolucao(historicoRede);

  return {
    total_colaboradores: cols.length,
    evoluindo: cols.filter((c) => c.situacao === 'evoluindo').length,
    estavel: cols.filter((c) => c.situacao === 'estavel').length,
    regredindo: cols.filter((c) => c.situacao === 'regredindo').length,
    sem_historico: cols.filter((c) => c.situacao === 'sem_historico').length,
    media_rede,
    delta_rede: delta_rede ?? redeMetricas.delta,
    situacao_rede: redeMetricas.situacao,
  };
}

export async function montarPayloadEvolucaoRede(
  supabase: SupabaseAdmin,
  opts?: { unidade_slug?: string; setor?: string; incluir_criterios?: boolean }
): Promise<PayloadEvolucaoRede> {
  let qColab = supabase
    .from('colaboradores')
    .select('id, nome, setor, cargo, role, onboarding_completo, unidades(slug, nome)')
    .eq('onboarding_completo', true);

  if (opts?.unidade_slug) {
    const { data: u } = await supabase.from('unidades').select('id').eq('slug', opts.unidade_slug).maybeSingle();
    if (u?.id) qColab = qColab.eq('unidade_id', u.id);
  }
  if (opts?.setor?.trim()) qColab = qColab.eq('setor', opts.setor.trim());

  const { data: colabsRaw, error: errColab } = await qColab;
  if (errColab) throw new Error(errColab.message);

  const colabs: ColabMeta[] = (colabsRaw ?? [])
    .map((c) => {
      const unidadeRaw = (c as { unidades?: unknown }).unidades;
      const unidadeObj = Array.isArray(unidadeRaw) ? unidadeRaw[0] : unidadeRaw;
      const slug =
        unidadeObj && typeof unidadeObj === 'object' && 'slug' in unidadeObj
          ? String((unidadeObj as { slug?: string }).slug ?? '')
          : null;
      const unome =
        unidadeObj && typeof unidadeObj === 'object' && 'nome' in unidadeObj
          ? String((unidadeObj as { nome?: string }).nome ?? '')
          : null;
      return {
        id: String(c.id),
        nome: String(c.nome ?? ''),
        setor: (c as { setor?: string | null }).setor ?? null,
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        role: normalizePortalRole((c as { role?: string | null }).role),
        unidade_slug: slug,
        unidade_nome: unome,
        onboarding_completo: (c as { onboarding_completo?: boolean }).onboarding_completo === true,
      };
    })
    .filter((c) => !ROLES_EXCLUIDOS.has(c.role ?? ''));

  const ids = colabs.map((c) => c.id);
  if (ids.length === 0) {
    const vazioUnidades = UNIDADES_CADASTRO.map((u) => ({
      slug: u.slug,
      nome: u.label,
      media_atual: null,
      delta: null,
      situacao: 'sem_historico' as SituacaoEvolucao,
      total: 0,
      evoluindo: 0,
      estavel: 0,
      regredindo: 0,
      sem_historico: 0,
    }));
    const vazioSetores = SETORES_PREDEFINIDOS.map((s) => ({
      setor: s,
      media_atual: null,
      delta: null,
      situacao: 'sem_historico' as SituacaoEvolucao,
      total: 0,
      evoluindo: 0,
      estavel: 0,
      regredindo: 0,
      sem_historico: 0,
    }));
    return {
      gerado_em: new Date().toISOString(),
      resumo: {
        total_colaboradores: 0,
        evoluindo: 0,
        estavel: 0,
        regredindo: 0,
        sem_historico: 0,
        media_rede: null,
        delta_rede: null,
        situacao_rede: 'sem_historico',
      },
      executivo: montarResumoExecutivo([], vazioUnidades, vazioSetores),
      unidades: vazioUnidades,
      setores: vazioSetores,
      colaboradores: [],
      ranking_atual: [],
      ranking_evolucao: [],
    };
  }

  let linhas: LinhaAval[] = await buscarAvaliacoesParaEvolucao(supabase, ids);

  linhas = linhas.filter((l) => l.ignorada !== true);

  const ctx = await montarContextoConsolidacaoRanking(supabase, linhas);

  const porColaborador = new Map<string, LinhaAval[]>();
  for (const id of ids) porColaborador.set(id, []);
  for (const l of linhas) {
    const cid = String(l.colaborador_id);
    porColaborador.get(cid)?.push({
      ...l,
      avaliador_role: l.avaliador_role ?? ctx.rolePorAvaliador.get(String(l.avaliador_id ?? '')) ?? null,
    });
  }

  const colaboradores: ColaboradorEvolucao[] = [];

  for (const meta of colabs) {
    const raw = porColaborador.get(meta.id) ?? [];
    const liderIds = ctx.liderIdsPorColaborador[meta.id] ?? new Set<string>();
    const semanasConsolidadas = consolidarNotasSemanaisComReferencia(raw, {
      liderIds,
      rhIds: ctx.rhIds,
      desde: AVALIACAO_RANKING_EPOCA_INICIO,
    });
    const semanas: SemanaMedia[] = semanasConsolidadas.map((s) => ({
      data_referencia: s.data_referencia,
      media: s.media_dia,
    }));

    const metricas: MetricasEvolucao = calcularMetricasEvolucao(semanas);

    let melhor_criterio: string | null = null;
    let pior_criterio: string | null = null;
    if (opts?.incluir_criterios !== false && semanas.length >= EVOLUCAO_SEMANAS_JANELA) {
      const { recentes, anteriores } = criterioValoresPorJanela(raw, ctx, meta.id, EVOLUCAO_SEMANAS_JANELA);
      const cmp = compararCriteriosEvolucao(recentes, anteriores);
      melhor_criterio = labelCriterio(cmp.melhor);
      pior_criterio = labelCriterio(cmp.pior);
    }

    if (semanas.length === 0 && metricas.semanas_validas === 0) continue;

    colaboradores.push({
      id: meta.id,
      nome: meta.nome,
      setor: meta.setor,
      cargo: meta.cargo,
      unidade_slug: meta.unidade_slug,
      unidade_nome: meta.unidade_nome,
      nota_atual: metricas.nota_atual,
      media_recente: metricas.media_recente,
      delta: metricas.delta,
      situacao: metricas.situacao,
      semanas_validas: metricas.semanas_validas,
      historico: metricas.historico,
      melhor_criterio,
      pior_criterio,
    });
  }

  colaboradores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const ranking_atual = [...colaboradores]
    .filter((c) => (c.media_recente ?? c.nota_atual) != null)
    .sort(
      (a, b) =>
        (b.media_recente ?? b.nota_atual ?? 0) - (a.media_recente ?? a.nota_atual ?? 0) ||
        a.nome.localeCompare(b.nome, 'pt-BR')
    )
    .slice(0, 15)
    .map((c, i) => ({
      id: c.id,
      nome: c.nome,
      media: c.media_recente ?? c.nota_atual ?? 0,
      posicao: i + 1,
    }));

  const ranking_evolucao = [...colaboradores]
    .filter((c) => c.delta != null && c.situacao !== 'sem_historico')
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, 15)
    .map((c, i) => ({
      id: c.id,
      nome: c.nome,
      delta: c.delta ?? 0,
      posicao: i + 1,
    }));

  const unidades = agregarResumoUnidadeFromItems(colaboradores, UNIDADES_CADASTRO);
  const setores = agregarResumoSetor(colaboradores, SETORES_PREDEFINIDOS);
  const resumo = montarResumoRede(colaboradores);
  const executivo = montarResumoExecutivo(colaboradores, unidades, setores);

  return {
    gerado_em: new Date().toISOString(),
    resumo,
    executivo,
    unidades,
    setores,
    colaboradores,
    ranking_atual,
    ranking_evolucao,
  };
}

export function mapaTendenciasColaboradores(
  payload: Pick<PayloadEvolucaoRede, 'colaboradores'>
): Record<string, SituacaoEvolucao> {
  const out: Record<string, SituacaoEvolucao> = {};
  for (const c of payload.colaboradores) out[c.id] = c.situacao;
  return out;
}

export type PayloadEvolucaoResumo = Pick<
  PayloadEvolucaoRede,
  'gerado_em' | 'resumo' | 'executivo' | 'unidades' | 'setores' | 'ranking_atual' | 'ranking_evolucao'
> & {
  tendencias: Record<string, { situacao: SituacaoEvolucao; delta: number | null }>;
};

export function payloadSomenteResumo(payload: PayloadEvolucaoRede): PayloadEvolucaoResumo {
  const tendencias: Record<string, { situacao: SituacaoEvolucao; delta: number | null }> = {};
  for (const c of payload.colaboradores) {
    tendencias[c.id] = { situacao: c.situacao, delta: c.delta };
  }
  return {
    gerado_em: payload.gerado_em,
    resumo: payload.resumo,
    executivo: payload.executivo,
    unidades: payload.unidades,
    setores: payload.setores,
    ranking_atual: payload.ranking_atual,
    ranking_evolucao: payload.ranking_evolucao,
    tendencias,
  };
}
