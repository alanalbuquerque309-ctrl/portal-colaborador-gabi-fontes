import type { createAdminClient } from '@/lib/supabase/admin';
import { AVALIACAO_RANKING_EPOCA_INICIO } from '@/lib/avaliacao-ranking';
import {
  calcularMetricasEvolucao,
  EVOLUCAO_HISTORICO_MAX,
  EVOLUCAO_ILI_LIMIAR,
  type SemanaMedia,
  type SituacaoEvolucao,
} from '@/lib/evolucao';
import {
  calcularTodosILILideresSemana,
  semanaReferenciaLiderInspirador,
  type ILICalculoInterno,
} from '@/lib/lider-inspirador';
import { listarUltimasSemanasSegunda } from '@/lib/semana-referencia';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LiderEvolucao = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_nome: string | null;
  ili_atual: number | null;
  ili_media_recente: number | null;
  delta: number | null;
  situacao: SituacaoEvolucao;
  semanas_validas: number;
  historico: SemanaMedia[];
  elegivel_semana_atual: boolean;
  motivos_elegibilidade: string[];
  n_equipe: number;
  media_equipe: number | null;
  media_feedback: number | null;
};

export type PayloadEvolucaoLideranca = {
  gerado_em: string;
  semana_referencia: string;
  lideres: LiderEvolucao[];
  ranking_ili_atual: { id: string; nome: string; ili: number; posicao: number; elegivel: boolean }[];
  ranking_evolucao: { id: string; nome: string; delta: number; posicao: number }[];
};

export async function montarPayloadEvolucaoLideranca(
  supabase: SupabaseAdmin,
  opts?: { semanas?: number }
): Promise<PayloadEvolucaoLideranca> {
  const qtdSemanas = Math.min(12, Math.max(4, opts?.semanas ?? EVOLUCAO_HISTORICO_MAX));
  const semanaAtual = semanaReferenciaLiderInspirador();
  const semanas = listarUltimasSemanasSegunda(qtdSemanas, {
    ate: semanaAtual,
    desde: AVALIACAO_RANKING_EPOCA_INICIO,
  });

  const iliPorLider = new Map<string, SemanaMedia[]>();
  const ultimoCalculo = new Map<string, ILICalculoInterno>();

  for (const semana of semanas) {
    const calculos = await calcularTodosILILideresSemana(supabase, semana);
    for (const c of calculos) {
      const hist = iliPorLider.get(c.lider_id) ?? [];
      hist.push({ data_referencia: semana, media: c.ili });
      iliPorLider.set(c.lider_id, hist);
      if (semana === semanaAtual) ultimoCalculo.set(c.lider_id, c);
    }
  }

  const liderIds = Array.from(
    new Set([...Array.from(iliPorLider.keys()), ...Array.from(ultimoCalculo.keys())])
  );

  if (liderIds.length === 0) {
    return {
      gerado_em: new Date().toISOString(),
      semana_referencia: semanaAtual,
      lideres: [],
      ranking_ili_atual: [],
      ranking_evolucao: [],
    };
  }

  const { data: metaRows } = await supabase
    .from('colaboradores')
    .select('id, nome, setor, unidades(nome)')
    .in('id', liderIds);

  const metaPorId = new Map<string, { nome: string; setor: string | null; unidade_nome: string | null }>();
  for (const row of metaRows ?? []) {
    const unidadeRaw = (row as { unidades?: unknown }).unidades;
    const unidadeObj = Array.isArray(unidadeRaw) ? unidadeRaw[0] : unidadeRaw;
    metaPorId.set(String(row.id), {
      nome: String(row.nome ?? ''),
      setor: (row as { setor?: string | null }).setor ?? null,
      unidade_nome:
        unidadeObj && typeof unidadeObj === 'object' && 'nome' in unidadeObj
          ? String((unidadeObj as { nome?: string }).nome ?? '')
          : null,
    });
  }

  const lideres: LiderEvolucao[] = [];

  for (const id of liderIds) {
    const meta = metaPorId.get(id);
    if (!meta) continue;
    const historico = (iliPorLider.get(id) ?? []).sort((a, b) =>
      a.data_referencia.localeCompare(b.data_referencia)
    );
    if (historico.length === 0) continue;

    const metricas = calcularMetricasEvolucao(historico, {
      limiar: EVOLUCAO_ILI_LIMIAR,
      minPorJanela: 2,
    });
    const ultimo = ultimoCalculo.get(id);

    lideres.push({
      id,
      nome: meta.nome,
      setor: meta.setor,
      unidade_nome: meta.unidade_nome,
      ili_atual: metricas.nota_atual,
      ili_media_recente: metricas.media_recente,
      delta: metricas.delta,
      situacao: metricas.situacao,
      semanas_validas: metricas.semanas_validas,
      historico: metricas.historico,
      elegivel_semana_atual: ultimo?.elegivel ?? false,
      motivos_elegibilidade: ultimo?.motivos_elegibilidade ?? [],
      n_equipe: ultimo?.n_equipe ?? 0,
      media_equipe: ultimo?.media_equipe ?? null,
      media_feedback: ultimo?.media_feedback ?? null,
    });
  }

  lideres.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const ranking_ili_atual = [...lideres]
    .sort(
      (a, b) =>
        (b.ili_atual ?? b.ili_media_recente ?? 0) - (a.ili_atual ?? a.ili_media_recente ?? 0) ||
        a.nome.localeCompare(b.nome, 'pt-BR')
    )
    .slice(0, 15)
    .map((l, i) => ({
      id: l.id,
      nome: l.nome,
      ili: l.ili_atual ?? l.ili_media_recente ?? 0,
      posicao: i + 1,
      elegivel: l.elegivel_semana_atual,
    }));

  const ranking_evolucao = [...lideres]
    .filter((l) => l.delta != null && l.situacao !== 'sem_historico')
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, 15)
    .map((l, i) => ({
      id: l.id,
      nome: l.nome,
      delta: l.delta ?? 0,
      posicao: i + 1,
    }));

  return {
    gerado_em: new Date().toISOString(),
    semana_referencia: semanaAtual,
    lideres,
    ranking_ili_atual,
    ranking_evolucao,
  };
}
