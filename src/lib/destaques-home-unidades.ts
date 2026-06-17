import type { RankingAvaliacaoItem, RankingPorUnidade } from '@/components/mural/ranking-ui';

/** Abas fixas na home — ordem de exibição. */
export const DESTAQUE_ABAS_UNIDADE = [
  { id: 'geral', label: 'Geral' },
  { id: 'mesquita', label: 'Mesquita', slug: 'mesquita' },
  { id: 'barra', label: 'Barra', slug: 'barra' },
  { id: 'nova-iguacu', label: 'Nova Iguaçu', slug: 'nova-iguacu' },
  { id: 'fabrica', label: 'Fábrica', slug: 'fabrica' },
  { id: 'administrativo', label: 'Administração', slug: 'administrativo' },
] as const;

export type DestaqueAbaUnidadeId = (typeof DESTAQUE_ABAS_UNIDADE)[number]['id'];

function mapItem(raw: {
  posicao: number;
  colaborador_id: string;
  nome: string;
  foto_url: string | null;
  media: number;
  semanas_avaliadas: number;
  unidade_nome: string;
  unidade_slug: string;
  setor: string | null;
}): RankingAvaliacaoItem {
  return {
    posicao: raw.posicao,
    colaborador_id: raw.colaborador_id,
    nome: raw.nome,
    foto_url: raw.foto_url,
    media: raw.media,
    semanas_avaliadas: raw.semanas_avaliadas,
    unidade_nome: raw.unidade_nome,
    unidade_slug: raw.unidade_slug,
    setor: raw.setor,
  };
}

export function top3DestaquePorAba(
  abaUnidade: DestaqueAbaUnidadeId,
  geral: RankingAvaliacaoItem[],
  porUnidade: RankingPorUnidade[]
): RankingAvaliacaoItem[] {
  if (abaUnidade === 'geral') {
    return geral.slice(0, 3);
  }
  const cfg = DESTAQUE_ABAS_UNIDADE.find((a) => a.id === abaUnidade);
  const slug = cfg && 'slug' in cfg ? cfg.slug : null;
  if (!slug) return [];
  const bloco = porUnidade.find((b) => b.unidade_slug === slug);
  return (bloco?.top ?? []).slice(0, 3);
}

export function normalizarTop3Geral(raw: unknown): RankingAvaliacaoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => mapItem(r as Parameters<typeof mapItem>[0]));
}

export function normalizarPorUnidade(raw: unknown): RankingPorUnidade[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => {
    const bloco = b as { unidade_slug: string; unidade_nome: string; top: unknown[] };
    return {
      unidade_slug: String(bloco.unidade_slug),
      unidade_nome: String(bloco.unidade_nome),
      top: Array.isArray(bloco.top)
        ? bloco.top.map((t) => mapItem(t as Parameters<typeof mapItem>[0]))
        : [],
    };
  });
}
