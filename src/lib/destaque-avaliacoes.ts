import type { SupabaseClient } from '@supabase/supabase-js';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import {
  agruparMediasPorColaborador,
  AVALIACAO_RANKING_MIN_SEMANAS,
  AVALIACAO_RANKING_MIN_SEMANAS_SEMANAL,
  inicioDataReferenciaRanking,
} from '@/lib/avaliacao-ranking';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';

export type DestaqueAvaliacaoItem = {
  id: string;
  titulo: string;
  descricao: string;
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_foto: string | null;
  unidade_id: string | null;
  unidade_nome: string | null;
  unidade_slug: string | null;
  media_mes?: number;
  dias_avaliados?: number;
  media_semana?: number;
  mes_referencia?: string;
  semana_inicio?: string;
};

type Candidato = {
  id: string;
  colaborador_nome: string;
  colaborador_foto: string | null;
  role: string;
  unidade_id: string | null;
  unidade_nome: string | null;
  unidade_slug: string | null;
  dias_avaliados: number;
  media: number;
};

function mesAtualBoundsUTC(): { ini: string; fim: string; mesRef: string } {
  const d = new Date();
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + 1;
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${ano}-${String(mes).padStart(2, '0')}` };
}

function toDestaque(
  item: Candidato,
  tipo: 'geral' | 'unidade' | 'semana_geral' | 'semana_unidade',
  extra: { mesRef?: string; semanaInicio?: string }
): DestaqueAvaliacaoItem {
  const isSemana = tipo.startsWith('semana');
  const titulo =
    tipo === 'geral'
      ? 'Destaque do mês (Geral)'
      : tipo === 'unidade'
        ? 'Destaque do mês'
        : tipo === 'semana_geral'
          ? 'Destaque da semana (Geral)'
          : 'Destaque da semana';
  const descricao = isSemana
    ? `Média ${item.media.toFixed(2)} na semana (avaliação da equipe).`
    : `Média ${item.media.toFixed(2)} em ${item.dias_avaliados} semana(s) avaliada(s) no mês.`;

  return {
    id: item.id,
    titulo,
    descricao,
    colaborador_id: item.id,
    colaborador_nome: item.colaborador_nome,
    colaborador_foto: item.colaborador_foto,
    unidade_id: item.unidade_id,
    unidade_nome: item.unidade_nome,
    unidade_slug: item.unidade_slug,
    ...(isSemana
      ? { media_semana: item.media, semana_inicio: extra.semanaInicio }
      : { media_mes: item.media, dias_avaliados: item.dias_avaliados, mes_referencia: extra.mesRef }),
  };
}

type LinhaDestaque = {
  colaborador_id: string;
  avaliador_id: string | null;
  data_referencia: string;
  media_dia: number;
  created_at?: string | null;
};

async function carregarCandidatos(
  supabase: SupabaseClient,
  linhas: LinhaDestaque[],
  minSemanas: number,
  periodoIni: string,
  ctx: Awaited<ReturnType<typeof montarContextoConsolidacaoRanking>>,
  periodoFim?: string
): Promise<Candidato[]> {
  if (linhas.length === 0) return [];

  const ids = Array.from(new Set(linhas.map((l) => String(l.colaborador_id)).filter(Boolean)));
  const porColabMedias = agruparMediasPorColaborador(linhas, ids, periodoIni, ctx, periodoFim);
  const porColab: Record<string, number[]> = {};
  for (const [cid, semanas] of Object.entries(porColabMedias)) {
    porColab[cid] = semanas
      .map((d) => d.media_dia)
      .filter((m): m is number => m !== null && !Number.isNaN(m));
  }
  const { data: cols, error } = await supabase
    .from('colaboradores')
    .select('id, nome, foto_url, role, unidade_id, unidades(nome, slug)')
    .in('id', ids);
  if (error) throw new Error(error.message);

  return (cols ?? [])
    .map((c) => {
      const notas = porColab[String(c.id)] ?? [];
      const semanas = notas.length;
      const media = semanas > 0 ? notas.reduce((a, b) => a + b, 0) / semanas : 0;
      const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
      return {
        id: String(c.id),
        colaborador_nome: String(c.nome ?? ''),
        colaborador_foto: c.foto_url ? String(c.foto_url) : null,
        role: String(c.role ?? '').toLowerCase(),
        unidade_id: c.unidade_id ? String(c.unidade_id) : null,
        unidade_nome: unidade?.nome ? String(unidade.nome) : null,
        unidade_slug: unidade?.slug ? String(unidade.slug) : null,
        dias_avaliados: semanas,
        media: Math.round(media * 100) / 100,
      };
    })
    .filter((c) => c.role === 'colaborador' && c.dias_avaliados >= minSemanas);
}

function ranquear(candidatos: Candidato[]): Candidato[] {
  return [...candidatos].sort(
    (a, b) => b.media - a.media || a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR')
  );
}

function destaquesPorUnidade(gerais: Candidato[]): Candidato[] {
  const porUnidade = new Map<string, Candidato>();
  for (const item of gerais) {
    const key = String(item.unidade_slug ?? '');
    if (!key || porUnidade.has(key)) continue;
    porUnidade.set(key, item);
  }
  return Array.from(porUnidade.values());
}

export async function calcularDestaquesMural(
  supabase: SupabaseClient,
  semanaInicio: string
): Promise<{
  destaque: DestaqueAvaliacaoItem | null;
  destaque_geral: DestaqueAvaliacaoItem | null;
  destaques_unidade: DestaqueAvaliacaoItem[];
  destaque_semana_geral: DestaqueAvaliacaoItem | null;
  destaques_semana_unidade: DestaqueAvaliacaoItem[];
  mes_referencia: string;
  semana_inicio: string;
  min_semanas_ranking_mensal: number;
  min_semanas_ranking_semanal: number;
  total_avaliacoes_semana: number;
}> {
  const { ini, fim, mesRef } = mesAtualBoundsUTC();
  const refMin = inicioDataReferenciaRanking(ini);

  const [{ data: linhasMes }, { data: linhasSemana, count: countSemana }] = await Promise.all([
    supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, avaliador_id, data_referencia, media_dia, created_at')
      .gte('data_referencia', refMin)
      .lte('data_referencia', fim)
      .not('media_dia', 'is', null)
      .limit(8000),
    supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, avaliador_id, data_referencia, media_dia, created_at', { count: 'exact' })
      .eq('data_referencia', semanaInicio)
      .gte('data_referencia', refMin)
      .not('media_dia', 'is', null)
      .limit(2000),
  ]);

  const mapLinhas = (rows: typeof linhasMes): LinhaDestaque[] =>
    filtrarAvaliacoesParaMedia(rows ?? []).map((r) => ({
      colaborador_id: String(r.colaborador_id),
      avaliador_id: r.avaliador_id != null ? String(r.avaliador_id) : null,
      data_referencia: String(r.data_referencia),
      media_dia: Number(r.media_dia),
      created_at: r.created_at != null ? String(r.created_at) : null,
    }));

  const linhasMesMap = mapLinhas(linhasMes);
  const linhasSemanaMap = mapLinhas(linhasSemana);
  const ctx = await montarContextoConsolidacaoRanking(supabase, [
    ...linhasMesMap,
    ...linhasSemanaMap,
  ]);

  const candidatosMes = await carregarCandidatos(
    supabase,
    linhasMesMap,
    AVALIACAO_RANKING_MIN_SEMANAS,
    ini,
    ctx,
    fim
  );
  const candidatosSemana = await carregarCandidatos(
    supabase,
    linhasSemanaMap,
    AVALIACAO_RANKING_MIN_SEMANAS_SEMANAL,
    semanaInicio,
    ctx
  );

  const geraisMes = ranquear(candidatosMes);
  const geraisSemana = ranquear(candidatosSemana);

  const destaqueGeral = geraisMes[0] ? toDestaque(geraisMes[0], 'geral', { mesRef }) : null;
  const destaqueSemanaGeral = geraisSemana[0]
    ? toDestaque(geraisSemana[0], 'semana_geral', { semanaInicio })
    : null;

  return {
    destaque_geral: destaqueGeral,
    destaque: destaqueGeral,
    destaques_unidade: destaquesPorUnidade(geraisMes).map((d) => toDestaque(d, 'unidade', { mesRef })),
    destaque_semana_geral: destaqueSemanaGeral,
    destaques_semana_unidade: destaquesPorUnidade(geraisSemana).map((d) =>
      toDestaque(d, 'semana_unidade', { semanaInicio })
    ),
    mes_referencia: mesRef,
    semana_inicio: semanaInicio,
    min_semanas_ranking_mensal: AVALIACAO_RANKING_MIN_SEMANAS,
    min_semanas_ranking_semanal: AVALIACAO_RANKING_MIN_SEMANAS_SEMANAL,
    total_avaliacoes_semana: countSemana ?? (linhasSemana ?? []).length,
  };
}
