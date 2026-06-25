import { areaCafeConectaDeSetor, type CafeConectaArea } from '@/lib/cafe-conecta/areas';
import type { CafeConectaColaboradorBase } from '@/lib/cafe-conecta/types';

export type CandidatoSorteio = CafeConectaColaboradorBase & {
  area: CafeConectaArea;
  participacoes_ciclo: number;
  participacoes_total: number;
};

export function chaveDupla(idA: string, idB: string): string {
  return [idA, idB].sort().join(':');
}

function scoreDupla(
  a: CandidatoSorteio,
  b: CandidatoSorteio,
  paresHistorico: Set<string>,
  permitirRepeticaoCiclo: boolean
): number {
  if (a.id === b.id) return -Infinity;

  let score = 0;

  if (!permitirRepeticaoCiclo) {
    if (a.participacoes_ciclo === 0 && b.participacoes_ciclo === 0) score += 10_000;
    else if (a.participacoes_ciclo === 0 || b.participacoes_ciclo === 0) score += 5_000;
    else return -Infinity;
  } else {
    if (a.participacoes_ciclo === 0 && b.participacoes_ciclo === 0) score += 8_000;
    else if (a.participacoes_ciclo === 0 || b.participacoes_ciclo === 0) score += 4_000;
  }

  if (!paresHistorico.has(chaveDupla(a.id, b.id))) score += 2_000;

  score -= (a.participacoes_total + b.participacoes_total) * 50;

  if (a.area !== b.area && a.area !== 'outro' && b.area !== 'outro') score += 800;

  return score;
}

export type ResultadoSorteioCafeConecta = {
  a: CandidatoSorteio;
  b: CandidatoSorteio;
  score: number;
  excecao_ciclo_impar: boolean;
  mesma_area: boolean;
  seed: string;
};

function randomSeed(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function melhorDuplaEntre(
  trabalho: CandidatoSorteio[],
  paresHistorico: Set<string>,
  permitirRepeticaoCiclo: boolean,
  seed: string
): ResultadoSorteioCafeConecta | null {
  if (trabalho.length < 2) return null;

  const jitter = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 97;
  let melhor: ResultadoSorteioCafeConecta | null = null;

  for (let i = 0; i < trabalho.length; i++) {
    for (let j = i + 1; j < trabalho.length; j++) {
      const a = trabalho[i];
      const b = trabalho[j];
      let score = scoreDupla(a, b, paresHistorico, permitirRepeticaoCiclo);
      if (!Number.isFinite(score)) continue;
      score += (i + j + jitter) % 13;
      if (!melhor || score > melhor.score) {
        melhor = {
          a,
          b,
          score,
          excecao_ciclo_impar: false,
          mesma_area: a.area === b.area,
          seed,
        };
      }
    }
  }

  return melhor;
}

/** Escolhe a melhor dupla entre candidatos elegíveis. */
export function sortearDuplaCafeConecta(opts: {
  candidatos: CandidatoSorteio[];
  idsNuncaNoCiclo: Set<string>;
  paresHistorico: Set<string>;
  seed?: string;
}): ResultadoSorteioCafeConecta | null {
  const pool = opts.candidatos.filter((c) => c.id);
  if (pool.length < 2) return null;

  const seed = opts.seed ?? randomSeed();
  const nuncaNoCiclo = pool.filter((c) => opts.idsNuncaNoCiclo.has(c.id));

  const tentativas: { trabalho: CandidatoSorteio[]; permitirRepeticao: boolean; excecaoImpar: boolean }[] = [];

  if (nuncaNoCiclo.length >= 2) {
    tentativas.push({ trabalho: nuncaNoCiclo, permitirRepeticao: false, excecaoImpar: false });
  }
  tentativas.push({
    trabalho: pool,
    permitirRepeticao: true,
    excecaoImpar: nuncaNoCiclo.length === 1,
  });

  for (const t of tentativas) {
    const melhor = melhorDuplaEntre(t.trabalho, opts.paresHistorico, t.permitirRepeticao, seed);
    if (melhor) {
      return { ...melhor, excecao_ciclo_impar: t.excecaoImpar };
    }
  }

  return {
    a: pool[0],
    b: pool[1],
    score: 0,
    excecao_ciclo_impar: nuncaNoCiclo.length === 1,
    mesma_area: pool[0].area === pool[1].area,
    seed,
  };
}

export function prepararCandidatosSorteio(
  elegiveis: CafeConectaColaboradorBase[],
  participacoesCiclo: Map<string, number>,
  participacoesTotal: Map<string, number>
): CandidatoSorteio[] {
  return elegiveis.map((c) => ({
    ...c,
    area: areaCafeConectaDeSetor(c.setor),
    participacoes_ciclo: participacoesCiclo.get(c.id) ?? 0,
    participacoes_total: participacoesTotal.get(c.id) ?? 0,
  }));
}
