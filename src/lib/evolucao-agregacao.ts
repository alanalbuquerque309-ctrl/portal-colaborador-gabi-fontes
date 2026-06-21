import type { SituacaoEvolucao, SemanaMedia } from '@/lib/evolucao';
import { calcularMetricasEvolucao } from '@/lib/evolucao';

export type ColaboradorEvolAgg = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_slug: string | null;
  unidade_nome: string | null;
  nota_atual: number | null;
  media_recente: number | null;
  delta: number | null;
  situacao: SituacaoEvolucao;
  historico: SemanaMedia[];
};

export type SetorEvolucao = {
  setor: string;
  media_atual: number | null;
  delta: number | null;
  situacao: SituacaoEvolucao;
  total: number;
  evoluindo: number;
  estavel: number;
  regredindo: number;
  sem_historico: number;
};

export type UnidadeEvolucaoAgg = {
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

type GrupoAgg = {
  id: string;
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

function agregarColaboradoresPorChave(
  items: ColaboradorEvolAgg[],
  chaveDe: (c: ColaboradorEvolAgg) => string,
  rotulosOrdenados: { id: string; nome: string }[]
): GrupoAgg[] {
  const porChave = new Map<string, ColaboradorEvolAgg[]>();
  for (const c of items) {
    const k = chaveDe(c);
    const list = porChave.get(k) ?? [];
    list.push(c);
    porChave.set(k, list);
  }

  const extras = Array.from(porChave.keys()).filter((k) => !rotulosOrdenados.some((r) => r.id === k));
  const ordem = [
    ...rotulosOrdenados,
    ...extras.sort().map((id) => ({ id, nome: id === 'sem-setor' ? 'Sem setor' : id })),
  ];

  return ordem.map(({ id, nome }) => {
    const cols = porChave.get(id) ?? [];
    const medias = cols
      .map((c) => c.media_recente ?? c.nota_atual)
      .filter((m): m is number => m != null && !Number.isNaN(m));
    const deltas = cols.map((c) => c.delta).filter((d): d is number => d != null);
    const media_atual =
      medias.length > 0
        ? Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 100) / 100
        : null;
    const delta_grupo =
      deltas.length > 0
        ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 100) / 100
        : null;

    const historico = cols
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

    const metricas = calcularMetricasEvolucao(historico);

    return {
      id,
      nome,
      media_atual,
      delta: delta_grupo ?? metricas.delta,
      situacao:
        metricas.situacao === 'sem_historico' && delta_grupo != null
          ? delta_grupo >= 0.1
            ? 'evoluindo'
            : delta_grupo <= -0.1
              ? 'regredindo'
              : 'estavel'
          : metricas.situacao,
      total: cols.length,
      evoluindo: cols.filter((c) => c.situacao === 'evoluindo').length,
      estavel: cols.filter((c) => c.situacao === 'estavel').length,
      regredindo: cols.filter((c) => c.situacao === 'regredindo').length,
      sem_historico: cols.filter((c) => c.situacao === 'sem_historico').length,
    };
  });
}

export function agregarResumoSetor(
  items: ColaboradorEvolAgg[],
  setoresOrdenados: readonly string[]
): SetorEvolucao[] {
  const grupos = agregarColaboradoresPorChave(
    items,
    (c) => (c.setor?.trim() ? c.setor.trim() : 'sem-setor'),
    setoresOrdenados.map((s) => ({ id: s, nome: s }))
  );
  return grupos
    .filter((g) => g.total > 0 || setoresOrdenados.includes(g.id))
    .map((g) => ({
      setor: g.nome,
      media_atual: g.media_atual,
      delta: g.delta,
      situacao: g.situacao,
      total: g.total,
      evoluindo: g.evoluindo,
      estavel: g.estavel,
      regredindo: g.regredindo,
      sem_historico: g.sem_historico,
    }))
    .sort((a, b) => a.setor.localeCompare(b.setor, 'pt-BR'));
}

export function agregarResumoUnidadeFromItems(
  items: ColaboradorEvolAgg[],
  unidades: readonly { slug: string; label: string }[]
): UnidadeEvolucaoAgg[] {
  return agregarColaboradoresPorChave(
    items,
    (c) => c.unidade_slug ?? 'sem-unidade',
    unidades.map((u) => ({ id: u.slug, nome: u.label }))
  ).map((g) => ({
    slug: g.id,
    nome: g.nome,
    media_atual: g.media_atual,
    delta: g.delta,
    situacao: g.situacao,
    total: g.total,
    evoluindo: g.evoluindo,
    estavel: g.estavel,
    regredindo: g.regredindo,
    sem_historico: g.sem_historico,
  }));
}

export type ResumoExecutivoEvolucao = {
  unidades_atencao: { slug: string; nome: string; regredindo: number; media_atual: number | null }[];
  unidade_em_evolucao: { slug: string; nome: string; evoluindo: number } | null;
  setores_atencao: { setor: string; regredindo: number }[];
  colaboradores_atencao: { id: string; nome: string; unidade_nome: string | null; delta: number | null }[];
  top_evolucao: { id: string; nome: string; delta: number } | null;
};

export function montarResumoExecutivo(
  colaboradores: ColaboradorEvolAgg[],
  unidades: UnidadeEvolucaoAgg[],
  setores: SetorEvolucao[]
): ResumoExecutivoEvolucao {
  const unidades_atencao = unidades
    .filter((u) => u.regredindo > 0 || u.situacao === 'regredindo')
    .sort((a, b) => b.regredindo - a.regredindo || (b.media_atual ?? 0) - (a.media_atual ?? 0))
    .slice(0, 5)
    .map((u) => ({
      slug: u.slug,
      nome: u.nome,
      regredindo: u.regredindo,
      media_atual: u.media_atual,
    }));

  const unidade_em_evolucao =
    [...unidades]
      .filter((u) => u.evoluindo > 0)
      .sort((a, b) => b.evoluindo - a.evoluindo || (b.media_atual ?? 0) - (a.media_atual ?? 0))[0] ?? null;

  const setores_atencao = setores
    .filter((s) => s.regredindo > 0)
    .sort((a, b) => b.regredindo - a.regredindo)
    .slice(0, 5)
    .map((s) => ({ setor: s.setor, regredindo: s.regredindo }));

  const colaboradores_atencao = colaboradores
    .filter((c) => c.situacao === 'regredindo')
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      unidade_nome: c.unidade_nome,
      delta: c.delta,
    }));

  const top_evolucao =
    [...colaboradores]
      .filter((c) => c.delta != null && c.situacao === 'evoluindo')
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0] ?? null;

  return {
    unidades_atencao,
    unidade_em_evolucao: unidade_em_evolucao
      ? { slug: unidade_em_evolucao.slug, nome: unidade_em_evolucao.nome, evoluindo: unidade_em_evolucao.evoluindo }
      : null,
    setores_atencao,
    colaboradores_atencao,
    top_evolucao: top_evolucao
      ? { id: top_evolucao.id, nome: top_evolucao.nome, delta: top_evolucao.delta ?? 0 }
      : null,
  };
}
