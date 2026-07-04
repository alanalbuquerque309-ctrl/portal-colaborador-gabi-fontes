import type { SupabaseClient } from '@supabase/supabase-js';
import { listarEquipeDoLider } from '@/lib/colaborador-lideres';
import { isRoleGerenteAvaliador, podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { isSocioNegocioColaborador } from '@/lib/socios-negocio';
import { normalizePortalRole } from '@/lib/roles';
import {
  formatarIntervaloSemanaPtBR,
  semanaAnteriorInicioISO,
  semanaAvaliacaoEquipePadraoISO,
} from '@/lib/semana-referencia';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import type { ILIComponente, LiderInspiradorVencedor, PainelLider } from '@/lib/portal-home-types';
import {
  ILI_CAP_INFLACAO,
  ILI_MIN_EQUIPE,
  ILI_MIN_FEEDBACK,
  ILI_MIN_PCT_AVALIADO,
  ILI_PESOS,
} from '@/lib/nota-lider-constants';

export {
  ILI_CAP_INFLACAO,
  ILI_MIN_EQUIPE,
  ILI_MIN_FEEDBACK,
  ILI_MIN_PCT_AVALIADO,
  ILI_PESOS,
} from '@/lib/nota-lider-constants';

export type ILICalculoInterno = {
  lider_id: string;
  ili: number;
  componentes: ILIComponente[];
  elegivel: boolean;
  motivos_elegibilidade: string[];
  n_equipe: number;
  n_avaliados_semana: number;
  n_feedback_semana: number;
  media_equipe: number | null;
  media_feedback: number | null;
  pct_disciplina: number;
  pct_treinamentos: number;
  n_trofeus_equipe: number;
  delta_equipe: number | null;
};

function notaParaPontos(nota: number): number {
  const clamped = Math.max(1, Math.min(5, nota));
  return ((clamped - 1) / 4) * 100;
}

function mediaPilaresLideranca(row: Record<string, unknown>): number {
  const vals = [
    row.n_exemplo ?? row.n_organizacao,
    row.n_comunicacao ?? row.n_fala_escuta,
    row.n_suporte ?? row.n_apoio,
    row.n_justica ?? row.n_organizacao,
    row.n_clima ?? row.n_ambiente,
  ].map((v) => Number(v));
  const ok = vals.filter((n) => !Number.isNaN(n) && n >= 1 && n <= 5);
  if (ok.length === 0) return 3;
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}

function trimmedMean(values: number[]): number | null {
  if (values.length === 0) return null;
  if (values.length < 5) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function primeiroNome(nome: string): string {
  return String(nome ?? '').trim().split(/\s+/)[0] || 'Líder';
}

function montarComponentes(opts: {
  ptsFeedback: number;
  ptsEquipe: number;
  ptsDisciplina: number;
  ptsTreinamentos: number;
  ptsEngajamento: number;
}): ILIComponente[] {
  return [
    { label: 'O que a equipe fala de você', pontos: opts.ptsFeedback, peso: ILI_PESOS.feedback, contribuicao: opts.ptsFeedback * ILI_PESOS.feedback },
    { label: 'Média da sua equipe', pontos: opts.ptsEquipe, peso: ILI_PESOS.equipe, contribuicao: opts.ptsEquipe * ILI_PESOS.equipe },
    { label: 'Avaliou todo mundo?', pontos: opts.ptsDisciplina, peso: ILI_PESOS.disciplina, contribuicao: opts.ptsDisciplina * ILI_PESOS.disciplina },
    { label: 'Equipe no portal', pontos: opts.ptsTreinamentos, peso: ILI_PESOS.treinamentos, contribuicao: opts.ptsTreinamentos * ILI_PESOS.treinamentos },
    { label: 'Troféus da equipe', pontos: ptsEngajamentoSafe(opts.ptsEngajamento), peso: ILI_PESOS.engajamento, contribuicao: ptsEngajamentoSafe(opts.ptsEngajamento) * ILI_PESOS.engajamento },
  ];
}

function ptsEngajamentoSafe(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function iliDeComponentes(componentes: ILIComponente[]): number {
  const total = componentes.reduce((s, c) => s + c.contribuicao, 0);
  return Math.round(total * 10) / 10;
}

export function semanaReferenciaLiderInspirador(_ref: Date = new Date()): string {
  return semanaAvaliacaoEquipePadraoISO();
}

export function semanaFeedbackLiderInspirador(_ref: Date = new Date()): string {
  return segundaSemanaSaoPaulo();
}

type DadosSemanaCache = {
  semanaEquipe: string;
  semanaFeedback: string;
  semanaAnterior: string;
  avaliacoesEquipe: Map<string, { media: number | null; avaliador_id: string | null }>;
  avaliacoesSemanaAnterior: Map<string, { media: number | null; avaliador_id: string | null }>;
  feedbackPorLider: Map<string, number[]>;
  trofeusPorColab: Map<string, number>;
  mediasEquipePorLider: Map<string, number | null>;
};

type RankingCacheEntry = {
  expira: number;
  payload: Awaited<ReturnType<typeof calcularRankingLiderInspiradorCore>>;
};

const rankingCachePorSemana = new Map<string, RankingCacheEntry>();
const RANKING_CACHE_TTL_MS = 5 * 60 * 1000;

async function carregarDadosSemana(
  supabase: SupabaseClient,
  semanaEquipe: string
): Promise<DadosSemanaCache> {
  const semanaFeedback = semanaFeedbackLiderInspirador();
  const semanaAnterior = semanaAnteriorInicioISO(new Date(semanaEquipe + 'T12:00:00'));

  const [{ data: avaliacoes }, { data: feedback }, { data: trofeus }] = await Promise.all([
    supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, avaliador_id, media_dia, data_referencia')
      .in('data_referencia', [semanaEquipe, semanaAnterior])
      .limit(2000),
    supabase
      .from('avaliacoes_lideranca')
      .select(
        'avaliado_id, n_exemplo, n_comunicacao, n_suporte, n_justica, n_clima, n_organizacao, n_fala_escuta, n_apoio, n_ambiente'
      )
      .eq('semana_inicio', semanaFeedback)
      .limit(500),
    supabase
      .from('trofeus_entre_pares')
      .select('destinatario_id')
      .eq('semana_inicio', semanaEquipe)
      .limit(500),
  ]);

  const avaliacoesEquipe = new Map<string, { media: number | null; avaliador_id: string | null }>();
  const avaliacoesSemanaAnterior = new Map<string, { media: number | null; avaliador_id: string | null }>();
  for (const row of avaliacoes ?? []) {
    const cid = String(row.colaborador_id ?? '');
    if (!cid) continue;
    const ref = String(row.data_referencia ?? '');
    const entry = {
      media: row.media_dia != null ? Number(row.media_dia) : null,
      avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
    };
    if (ref === semanaAnterior) {
      avaliacoesSemanaAnterior.set(cid, entry);
    } else {
      avaliacoesEquipe.set(cid, entry);
    }
  }

  const feedbackPorLider = new Map<string, number[]>();
  for (const row of feedback ?? []) {
    const lid = String(row.avaliado_id ?? '');
    if (!lid) continue;
    const media = mediaPilaresLideranca(row as Record<string, unknown>);
    const arr = feedbackPorLider.get(lid) ?? [];
    arr.push(media);
    feedbackPorLider.set(lid, arr);
  }

  const trofeusPorColab = new Map<string, number>();
  for (const row of trofeus ?? []) {
    const id = String(row.destinatario_id ?? '');
    if (!id) continue;
    trofeusPorColab.set(id, (trofeusPorColab.get(id) ?? 0) + 1);
  }

  return {
    semanaEquipe,
    semanaFeedback,
    semanaAnterior,
    avaliacoesEquipe,
    avaliacoesSemanaAnterior,
    feedbackPorLider,
    trofeusPorColab,
    mediasEquipePorLider: new Map(),
  };
}

export async function listarIdsLideresAtivos(supabase: SupabaseClient): Promise<string[]> {
  const ids = new Set<string>();

  const { data: configRows } = await supabase
    .from('lideres_por_setor')
    .select('lider_id')
    .eq('ativo', true);
  for (const row of configRows ?? []) {
    const id = String(row.lider_id ?? '');
    if (id) ids.add(id);
  }

  const { data: gerentes } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .or('role.eq.gerente,role.eq.master,role.eq.admin,role.eq.chefe,role.eq.lider');
  for (const row of gerentes ?? []) {
    if (
      isRoleGerenteAvaliador(String(row.role ?? '')) &&
      !isSocioNegocioColaborador({ nome: String(row.nome ?? ''), role: String(row.role ?? '') })
    ) {
      ids.add(String(row.id));
    }
  }

  if (ids.size === 0) return [];

  const { data: meta } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .in('id', Array.from(ids));

  return (meta ?? [])
    .filter((c) => !isSocioNegocioColaborador({ nome: String(c.nome ?? ''), role: String(c.role ?? '') }))
    .map((c) => String(c.id));
}

async function mediaEquipeSemana(
  supabase: SupabaseClient,
  equipeIds: string[],
  semanaInicio: string,
  cache: DadosSemanaCache
): Promise<number | null> {
  const mapa =
    semanaInicio === cache.semanaAnterior ? cache.avaliacoesSemanaAnterior : cache.avaliacoesEquipe;
  const medias: number[] = [];
  for (const id of equipeIds) {
    let row = mapa.get(id);
    if (!row) {
      const { data } = await supabase
        .from('avaliacoes_diarias')
        .select('media_dia')
        .eq('colaborador_id', id)
        .eq('data_referencia', semanaInicio)
        .maybeSingle();
      row = { media: data?.media_dia != null ? Number(data.media_dia) : null, avaliador_id: null };
    }
    if (row.media != null && !Number.isNaN(row.media)) medias.push(row.media);
  }
  if (medias.length === 0) return null;
  return medias.reduce((a, b) => a + b, 0) / medias.length;
}

export async function calcularILILider(
  supabase: SupabaseClient,
  liderId: string,
  opts?: { semanaEquipe?: string; cache?: DadosSemanaCache; mediasEquipeRede?: number[] }
): Promise<ILICalculoInterno> {
  const semanaEquipe = opts?.semanaEquipe ?? semanaReferenciaLiderInspirador();
  const cache = opts?.cache ?? (await carregarDadosSemana(supabase, semanaEquipe));

  const equipeRaw = await listarEquipeDoLider(supabase, liderId, null);
  const equipe = equipeRaw.filter((m) => normalizePortalRole(m.role) === 'colaborador');
  const equipeIds = equipe.map((m) => m.id);

  const nEquipe = equipe.length;
  let nAvaliados = 0;
  for (const id of equipeIds) {
    if (cache.avaliacoesEquipe.has(id)) nAvaliados++;
  }

  const feedbacks = cache.feedbackPorLider.get(liderId) ?? [];
  const nFeedback = feedbacks.length;
  const mediaFeedback = trimmedMean(feedbacks);

  const pctAvaliado = nEquipe > 0 ? nAvaliados / nEquipe : 0;
  const pctTreino = nEquipe > 0 ? equipe.filter((m) => m.onboarding_completo).length / nEquipe : 0;

  let nTrofeusEquipe = 0;
  for (const id of equipeIds) {
    nTrofeusEquipe += cache.trofeusPorColab.get(id) ?? 0;
  }

  const mediaEquipe = await mediaEquipeSemana(supabase, equipeIds, semanaEquipe, cache);
  cache.mediasEquipePorLider.set(liderId, mediaEquipe);

  const mediaEquipeAnterior =
    equipeIds.length > 0
      ? await mediaEquipeSemana(supabase, equipeIds, cache.semanaAnterior, cache)
      : null;
  const deltaEquipe =
    mediaEquipe != null && mediaEquipeAnterior != null
      ? Math.round((mediaEquipe - mediaEquipeAnterior) * 100) / 100
      : null;

  const motivosElegibilidade: string[] = [];
  if (nEquipe < ILI_MIN_EQUIPE) motivosElegibilidade.push(`Equipe com menos de ${ILI_MIN_EQUIPE} colaboradores`);
  if (pctAvaliado < ILI_MIN_PCT_AVALIADO) {
    motivosElegibilidade.push(
      `Menos de ${Math.round(ILI_MIN_PCT_AVALIADO * 100)}% da equipe avaliada (${nAvaliados}/${nEquipe})`
    );
  }
  if (nFeedback < ILI_MIN_FEEDBACK) {
    motivosElegibilidade.push(`Menos de ${ILI_MIN_FEEDBACK} feedbacks de liderança`);
  }
  const elegivel = motivosElegibilidade.length === 0;

  let ptsFeedback = mediaFeedback != null ? notaParaPontos(mediaFeedback) : 0;
  let ptsEquipe = mediaEquipe != null ? notaParaPontos(mediaEquipe) : 0;

  if (opts?.mediasEquipeRede && mediaEquipe != null && opts.mediasEquipeRede.length >= 3) {
    const mediana =
      [...opts.mediasEquipeRede].sort((a, b) => a - b)[Math.floor(opts.mediasEquipeRede.length / 2)] ?? 0;
    const desvio = stdDev(opts.mediasEquipeRede);
    if (mediaEquipe > mediana + desvio && desvio > 0) {
      ptsEquipe = Math.min(ptsEquipe, ILI_CAP_INFLACAO);
    }
  }

  const ptsDisciplina = pctAvaliado * 100;
  const ptsTreinamentos = pctTreino * 100;
  const ptsEngajamento = Math.min(nTrofeusEquipe / 10, 1) * 100;

  const componentes = montarComponentes({
    ptsFeedback,
    ptsEquipe,
    ptsDisciplina,
    ptsTreinamentos,
    ptsEngajamento,
  });

  return {
    lider_id: liderId,
    ili: iliDeComponentes(componentes),
    componentes,
    elegivel,
    motivos_elegibilidade: motivosElegibilidade,
    n_equipe: nEquipe,
    n_avaliados_semana: nAvaliados,
    n_feedback_semana: nFeedback,
    media_equipe: mediaEquipe,
    media_feedback: mediaFeedback,
    pct_disciplina: pctAvaliado,
    pct_treinamentos: pctTreino,
    n_trofeus_equipe: nTrofeusEquipe,
    delta_equipe: deltaEquipe,
  };
}

function montarMotivosPublicos(c: ILICalculoInterno): string[] {
  const motivos: string[] = [];
  if (c.media_equipe != null) {
    const base = `Equipe com média ${c.media_equipe.toFixed(1).replace('.', ',')} na semana`;
    motivos.push(c.delta_equipe != null && c.delta_equipe > 0 ? `${base} (+${c.delta_equipe.toFixed(1).replace('.', ',')} vs semana anterior)` : base);
  }
  if (c.pct_disciplina >= 0.999) {
    motivos.push('100% das avaliações da equipe concluídas');
  } else if (c.pct_disciplina >= ILI_MIN_PCT_AVALIADO) {
    motivos.push(`${Math.round(c.pct_disciplina * 100)}% da equipe avaliada na semana`);
  }
  if (c.media_feedback != null) {
    motivos.push(`Feedback de liderança: ${c.media_feedback.toFixed(1).replace('.', ',')}`);
  }
  if (c.n_trofeus_equipe > 0) {
    motivos.push(`Equipe recebeu ${c.n_trofeus_equipe} troféu${c.n_trofeus_equipe === 1 ? '' : 's'} entre pares`);
  }
  return motivos.slice(0, 3);
}

function compararLideres(a: ILICalculoInterno, b: ILICalculoInterno): number {
  if (b.ili !== a.ili) return b.ili - a.ili;
  const fbA = a.media_feedback ?? 0;
  const fbB = b.media_feedback ?? 0;
  if (fbB !== fbA) return fbB - fbA;
  const dA = a.delta_equipe ?? -999;
  const dB = b.delta_equipe ?? -999;
  if (dB !== dA) return dB - dA;
  return b.pct_disciplina - a.pct_disciplina;
}

/** ILI de todos os líderes ativos numa semana (inclui inelegíveis). */
export async function calcularTodosILILideresSemana(
  supabase: SupabaseClient,
  semanaEquipe: string
): Promise<ILICalculoInterno[]> {
  const cache = await carregarDadosSemana(supabase, semanaEquipe);
  const liderIds = await listarIdsLideresAtivos(supabase);

  let calculos: ILICalculoInterno[] = [];
  for (const lid of liderIds) {
    calculos.push(await calcularILILider(supabase, lid, { semanaEquipe, cache }));
  }

  const mediasRede = calculos
    .map((c) => c.media_equipe)
    .filter((m): m is number => m != null && !Number.isNaN(m));

  if (mediasRede.length >= 3) {
    calculos = await Promise.all(
      calculos.map((c) =>
        calcularILILider(supabase, c.lider_id, { semanaEquipe, cache, mediasEquipeRede: mediasRede })
      )
    );
  }

  return calculos;
}

export async function calcularRankingLiderInspirador(
  supabase: SupabaseClient,
  opts?: { semanaEquipe?: string }
): Promise<{
  semana_inicio: string;
  semana_rotulo: string;
  ranking: ILICalculoInterno[];
  vencedor: LiderInspiradorVencedor | null;
}> {
  const semanaEquipe = opts?.semanaEquipe ?? semanaReferenciaLiderInspirador();
  const cached = rankingCachePorSemana.get(semanaEquipe);
  if (cached && cached.expira > Date.now()) {
    return cached.payload;
  }
  const payload = await calcularRankingLiderInspiradorCore(supabase, semanaEquipe);
  rankingCachePorSemana.set(semanaEquipe, { expira: Date.now() + RANKING_CACHE_TTL_MS, payload });
  return payload;
}

async function calcularRankingLiderInspiradorCore(
  supabase: SupabaseClient,
  semanaEquipe: string
): Promise<{
  semana_inicio: string;
  semana_rotulo: string;
  ranking: ILICalculoInterno[];
  vencedor: LiderInspiradorVencedor | null;
}> {
  const semanaRotulo = formatarIntervaloSemanaPtBR(semanaEquipe);
  const calculos = await calcularTodosILILideresSemana(supabase, semanaEquipe);

  const elegiveis = calculos.filter((c) => c.elegivel).sort(compararLideres);
  const top = elegiveis[0] ?? null;

  let vencedor: LiderInspiradorVencedor | null = null;
  if (top) {
    const { data: lider } = await supabase
      .from('colaboradores')
      .select('id, nome, foto_url, setor, unidades(nome)')
      .eq('id', top.lider_id)
      .maybeSingle();

    if (lider) {
      const unidade = Array.isArray(lider.unidades) ? lider.unidades[0] : lider.unidades;
      vencedor = {
        lider_id: top.lider_id,
        nome: String(lider.nome ?? ''),
        foto_url: lider.foto_url ? String(lider.foto_url) : null,
        unidade_nome: unidade?.nome ? String(unidade.nome) : '',
        setor: lider.setor ? String(lider.setor) : null,
        ili: top.ili,
        motivos: montarMotivosPublicos(top),
        semana_rotulo: semanaRotulo,
        semana_inicio: semanaEquipe,
      };
    }
  }

  return {
    semana_inicio: semanaEquipe,
    semana_rotulo: semanaRotulo,
    ranking: elegiveis,
    vencedor,
  };
}

export async function montarPainelLiderInspirador(
  supabase: SupabaseClient,
  liderId: string,
  nome: string,
  role: string,
  opts?: { usarRankingCompleto?: boolean }
): Promise<PainelLider | null> {
  const idsLideres = await listarIdsLideresAtivos(supabase);
  const podeEquipe = await podeUsarAvaliacaoEquipeSemanal(supabase, liderId, role);
  if (!podeEquipe && !idsLideres.includes(liderId)) return null;

  const semanaEquipe = semanaReferenciaLiderInspirador();
  const semanaRotulo = formatarIntervaloSemanaPtBR(semanaEquipe);
  const meu = await calcularILILider(supabase, liderId, { semanaEquipe });

  let posicao: number | null = null;
  let totalElegiveis = 0;
  let ehVencedor = false;

  const cached = rankingCachePorSemana.get(semanaEquipe);
  if (cached && cached.expira > Date.now()) {
    const ranking = cached.payload.ranking;
    totalElegiveis = ranking.length;
    if (meu.elegivel) {
      const idx = ranking.findIndex((r) => r.lider_id === liderId);
      posicao = idx >= 0 ? idx + 1 : null;
    }
    ehVencedor = ranking[0]?.lider_id === liderId;
  } else if (opts?.usarRankingCompleto) {
    const { ranking } = await calcularRankingLiderInspirador(supabase, { semanaEquipe });
    totalElegiveis = ranking.length;
    if (meu.elegivel) {
      const idx = ranking.findIndex((r) => r.lider_id === liderId);
      posicao = idx >= 0 ? idx + 1 : null;
    }
    ehVencedor = ranking[0]?.lider_id === liderId;
  }

  return {
    primeiro_nome: primeiroNome(nome),
    ili: meu.ili,
    componentes: meu.componentes,
    n_equipe: meu.n_equipe,
    n_avaliados_semana: meu.n_avaliados_semana,
    n_feedback_semana: meu.n_feedback_semana,
    semana_rotulo: semanaRotulo,
    semana_inicio: semanaEquipe,
    elegivel: meu.elegivel,
    motivos_elegibilidade: meu.motivos_elegibilidade,
    posicao_entre_lideres: posicao,
    total_lideres_elegiveis: totalElegiveis,
    eh_vencedor_semana: ehVencedor,
  };
}
