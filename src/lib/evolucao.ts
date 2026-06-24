/** Camada Evolução — tendência semanal (Atual vs janelas anteriores). */

export const EVOLUCAO_LIMIAR = 0.1;
/** Limiar de tendência para ILI (escala 0–100). */
export const EVOLUCAO_ILI_LIMIAR = 2;
export const EVOLUCAO_SEMANAS_JANELA = 4;
export const EVOLUCAO_MIN_SEMANAS_POR_JANELA = 2;
export const EVOLUCAO_HISTORICO_MAX = 8;

export type SituacaoEvolucao = 'evoluindo' | 'estavel' | 'regredindo' | 'sem_historico';

export type SemanaMedia = { data_referencia: string; media: number };

export type MetricasEvolucao = {
  situacao: SituacaoEvolucao;
  delta: number | null;
  nota_atual: number | null;
  media_recente: number | null;
  media_anterior: number | null;
  semanas_validas: number;
  historico: SemanaMedia[];
};

export const CRITERIOS_EVOLUCAO = [
  { key: 'vestimenta', label: 'Vestimenta' },
  { key: 'pontualidade', label: 'Pontualidade' },
  { key: 'trabalhoEquipe', label: 'Trabalho em equipe' },
  { key: 'desempenhoTarefas', label: 'Desempenho nas tarefas' },
  { key: 'proatividade', label: 'Proatividade' },
] as const;

export type CriterioKey = (typeof CRITERIOS_EVOLUCAO)[number]['key'];

function mediaLista(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function classificarTendencia(delta: number | null, limiar = EVOLUCAO_LIMIAR): SituacaoEvolucao {
  if (delta == null || Number.isNaN(delta)) return 'sem_historico';
  if (delta >= limiar) return 'evoluindo';
  if (delta <= -limiar) return 'regredindo';
  return 'estavel';
}

/** Resolve janela de comparação: com pouco histórico usa metade recente × metade anterior (mín. 2 semanas). */
export function resolverJanelaEvolucao(
  semanasValidas: number,
  janelaPadrao = EVOLUCAO_SEMANAS_JANELA,
  minPorJanelaPadrao = EVOLUCAO_MIN_SEMANAS_POR_JANELA
): { janela: number; minPorJanela: number; podeComparar: boolean } {
  if (semanasValidas < 2) {
    return { janela: 0, minPorJanela: minPorJanelaPadrao, podeComparar: false };
  }

  const totalIdeal = janelaPadrao * 2;
  if (semanasValidas >= totalIdeal) {
    return { janela: janelaPadrao, minPorJanela: minPorJanelaPadrao, podeComparar: true };
  }

  const janela = Math.max(1, Math.floor(semanasValidas / 2));
  return { janela, minPorJanela: 1, podeComparar: true };
}

export function rotuloComparacaoEvolucao(semanasValidas: number): string {
  const { janela, podeComparar } = resolverJanelaEvolucao(semanasValidas);
  if (!podeComparar) return 'sem base comparável';
  if (semanasValidas >= EVOLUCAO_SEMANAS_JANELA * 2) {
    return `${janela}×${janela} semanas`;
  }
  return `${janela} recente × ${janela} anterior`;
}

export function rotuloSituacao(s: SituacaoEvolucao): string {
  switch (s) {
    case 'evoluindo':
      return 'Evoluindo';
    case 'estavel':
      return 'Estável';
    case 'regredindo':
      return 'Atenção';
    default:
      return 'Sem histórico';
  }
}

export function emojiSituacao(s: SituacaoEvolucao): string {
  switch (s) {
    case 'evoluindo':
      return '🟢';
    case 'estavel':
      return '➡️';
    case 'regredindo':
      return '🔴';
    default:
      return '⚪';
  }
}

export function tomSituacao(s: SituacaoEvolucao): 'verde' | 'neutro' | 'vermelho' | 'ambar' {
  switch (s) {
    case 'evoluindo':
      return 'verde';
    case 'estavel':
      return 'neutro';
    case 'regredindo':
      return 'vermelho';
    default:
      return 'ambar';
  }
}

export function formatarDelta(delta: number | null): string {
  if (delta == null || Number.isNaN(delta)) return '—';
  const sinal = delta > 0 ? '+' : '';
  return `${sinal}${delta.toFixed(2).replace('.', ',')}`;
}

export function formatarNota(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(2).replace('.', ',');
}

export function formatarIli(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(1).replace('.', ',');
}

/** Janelas: últimas N semanas vs N anteriores; com histórico curto, N adapta (ex.: 3 sem → 1×1). */
export function calcularMetricasEvolucao(
  semanas: SemanaMedia[],
  opts?: { janela?: number; minPorJanela?: number; historicoMax?: number; limiar?: number }
): MetricasEvolucao {
  const janelaPadrao = opts?.janela ?? EVOLUCAO_SEMANAS_JANELA;
  const minPorJanelaPadrao = opts?.minPorJanela ?? EVOLUCAO_MIN_SEMANAS_POR_JANELA;
  const historicoMax = opts?.historicoMax ?? EVOLUCAO_HISTORICO_MAX;
  const limiar = opts?.limiar ?? EVOLUCAO_LIMIAR;

  const ordenadas = [...semanas]
    .filter((s) => s.media != null && !Number.isNaN(s.media))
    .sort((a, b) => a.data_referencia.localeCompare(b.data_referencia));

  const historico = ordenadas.slice(-historicoMax);
  const semanasValidas = ordenadas.length;
  const nota_atual = ordenadas.length > 0 ? ordenadas[ordenadas.length - 1]!.media : null;

  const { janela, minPorJanela, podeComparar } = resolverJanelaEvolucao(
    semanasValidas,
    janelaPadrao,
    minPorJanelaPadrao
  );

  if (!podeComparar) {
    const mediaRecente =
      ordenadas.length > 0
        ? mediaLista(ordenadas.slice(-Math.min(janelaPadrao, ordenadas.length)).map((s) => s.media))
        : null;

    return {
      situacao: 'sem_historico',
      delta: null,
      nota_atual,
      media_recente: mediaRecente,
      media_anterior: null,
      semanas_validas: semanasValidas,
      historico,
    };
  }

  const recentes = ordenadas.slice(-janela);
  const anteriores = ordenadas.slice(-janela * 2, -janela);

  if (recentes.length < minPorJanela || anteriores.length < minPorJanela) {
    return {
      situacao: 'sem_historico',
      delta: null,
      nota_atual,
      media_recente: mediaLista(recentes.map((s) => s.media)),
      media_anterior: mediaLista(anteriores.map((s) => s.media)),
      semanas_validas: semanasValidas,
      historico,
    };
  }

  const media_recente = mediaLista(recentes.map((s) => s.media));
  const media_anterior = mediaLista(anteriores.map((s) => s.media));
  const delta =
    media_recente != null && media_anterior != null
      ? Math.round((media_recente - media_anterior) * 100) / 100
      : null;

  return {
    situacao: classificarTendencia(delta, limiar),
    delta,
    nota_atual,
    media_recente,
    media_anterior,
    semanas_validas: semanasValidas,
    historico,
  };
}

/** Compara médias de critérios entre janelas recente e anterior. */
export function compararCriteriosEvolucao(
  recentes: Partial<Record<CriterioKey, number[]>>,
  anteriores: Partial<Record<CriterioKey, number[]>>
): { melhor: CriterioKey | null; pior: CriterioKey | null } {
  let melhor: { key: CriterioKey; delta: number } | null = null;
  let pior: { key: CriterioKey; delta: number } | null = null;

  for (const c of CRITERIOS_EVOLUCAO) {
    const mRec = mediaLista(recentes[c.key] ?? []);
    const mAnt = mediaLista(anteriores[c.key] ?? []);
    if (mRec == null || mAnt == null) continue;
    const delta = Math.round((mRec - mAnt) * 100) / 100;
    if (!melhor || delta > melhor.delta) melhor = { key: c.key, delta };
    if (!pior || delta < pior.delta) pior = { key: c.key, delta };
  }

  return {
    melhor: melhor?.key ?? null,
    pior: pior?.key ?? null,
  };
}

export function labelCriterio(key: CriterioKey | null | undefined): string {
  if (!key) return '—';
  return CRITERIOS_EVOLUCAO.find((c) => c.key === key)?.label ?? key;
}
