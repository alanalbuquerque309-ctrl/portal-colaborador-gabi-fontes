/**
 * Avaliação semanal da equipe:
 * - Assiduidade (presente / folga / falta…) não entra na média numérica.
 * - Com presença: 5 critérios de 1 a 5 em meio ponto → média aritmética.
 * - Falta injustificada → média 0; isento → média null.
 */

import { normalizarNotaCriterio, notaCriterioValida } from '@/lib/avaliacao-notas';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';

export type AssiduidadeTipo =
  | 'presente'
  | 'folga'
  | 'outra_escala'
  | 'fora_plantao'
  | 'ferias'
  | 'falta_justificada'
  | 'falta_injustificada';

/** Semana sem média numérica (férias, fora do plantão ou registos legados de folga/escala). */
export function assiduidadeIsentaSemana(a: AssiduidadeTipo | string): boolean {
  return (
    a === 'falta_justificada' ||
    a === 'folga' ||
    a === 'outra_escala' ||
    a === 'fora_plantao' ||
    a === 'ferias'
  );
}

export function assiduidadeLegacySemanalRemovida(a: AssiduidadeTipo | string): boolean {
  return a === 'folga' || a === 'outra_escala' || a === 'falta_justificada';
}

/** Tipos aceitos em envios novos (avaliação semanal). */
export const ASSIDUIDADES_SEMANAL_ATIVAS: AssiduidadeTipo[] = [
  'presente',
  'falta_injustificada',
  'fora_plantao',
  'ferias',
];

export type NotasCriterios = {
  vestimenta: number | null;
  pontualidade: number | null;
  trabalhoEquipe: number | null;
  desempenhoTarefas: number | null;
  proatividade: number | null;
};

const CRITERIOS_ZERADOS: NotasCriterios = {
  vestimenta: 0,
  pontualidade: 0,
  trabalhoEquipe: 0,
  desempenhoTarefas: 0,
  proatividade: 0,
};

const CRITERIOS_VAZIOS: NotasCriterios = {
  vestimenta: null,
  pontualidade: null,
  trabalhoEquipe: null,
  desempenhoTarefas: null,
  proatividade: null,
};

function normalizarEntrada(notas: NotasCriterios): NotasCriterios {
  const norm = (n: number | null) =>
    n == null ? null : notaCriterioValida(n) ? normalizarNotaCriterio(n) : null;
  return {
    vestimenta: norm(notas.vestimenta),
    pontualidade: norm(notas.pontualidade),
    trabalhoEquipe: norm(notas.trabalhoEquipe),
    desempenhoTarefas: norm(notas.desempenhoTarefas),
    proatividade: norm(notas.proatividade),
  };
}

function mediaDosCriterios(notas: NotasCriterios): number | null {
  const vals = [
    notas.vestimenta,
    notas.pontualidade,
    notas.trabalhoEquipe,
    notas.desempenhoTarefas,
    notas.proatividade,
  ];
  if (vals.some((v) => v == null)) return null;
  const soma = (vals as number[]).reduce((a, b) => a + b, 0);
  return Math.round((soma / 5) * 100) / 100;
}

/** @deprecated Presença não compõe mais a média; mantido por compatibilidade de import. */
export function notaAssiduidadeNumerica(_assiduidade: AssiduidadeTipo): number | null {
  return null;
}

export function calcularMediaDia(
  assiduidade: AssiduidadeTipo,
  notas: NotasCriterios
): { media: number | null; notasPersistidas: NotasCriterios } {
  const entrada = normalizarEntrada(notas);

  if (assiduidadeIsentaSemana(assiduidade)) {
    return { media: null, notasPersistidas: { ...CRITERIOS_VAZIOS } };
  }

  if (assiduidade === 'falta_injustificada') {
    return { media: 0, notasPersistidas: { ...CRITERIOS_ZERADOS } };
  }

  const media = mediaDosCriterios(entrada);
  return { media, notasPersistidas: entrada };
}

export function listaValoresCriterios(notas: NotasCriterios): number[] {
  return [
    notas.vestimenta,
    notas.pontualidade,
    notas.trabalhoEquipe,
    notas.desempenhoTarefas,
    notas.proatividade,
  ].filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
}

export function temNotaBaixaEquipe(
  assiduidade: AssiduidadeTipo,
  notas: NotasCriterios
): boolean {
  if (assiduidade === 'falta_injustificada') return true;
  return listaValoresCriterios(notas).some((n) => n <= 3);
}

export type LinhaMediaMensal = { media_dia: number | null };

export function calcularMediaMensal(linhas: LinhaMediaMensal[]): number | null {
  const valores = linhas.map((l) => l.media_dia).filter((m): m is number => m !== null && !Number.isNaN(m));
  if (valores.length === 0) return null;
  const soma = valores.reduce((a, b) => a + b, 0);
  return Math.round((soma / valores.length) * 100) / 100;
}

export function formatarExibicaoAvaliacaoAdmin(l: {
  assiduidade: string;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
}): {
  mediaLabel: string;
  justificativaLabel: string;
  faltaInjustificada: boolean;
  isenta: boolean;
  foraPlantao: boolean;
  ferias: boolean;
  legado: boolean;
} {
  const just = String(l.justificativa_nota_baixa ?? '').trim();
  const a = assiduidadeDoBanco(l.assiduidade, just);

  if (a === 'falta_injustificada') {
    return {
      mediaLabel: '0,00',
      justificativaLabel: just
        ? `Falta injustificada — média zerada. ${just}`
        : 'Falta injustificada — média zerada.',
      faltaInjustificada: true,
      isenta: false,
      foraPlantao: false,
      ferias: false,
      legado: false,
    };
  }

  if (a === 'ferias') {
    return {
      mediaLabel: 'Férias',
      justificativaLabel: 'Colaborador de férias nesta semana — não entra na média.',
      faltaInjustificada: false,
      isenta: true,
      foraPlantao: false,
      ferias: true,
      legado: false,
    };
  }

  if (a === 'fora_plantao') {
    return {
      mediaLabel: 'Outro líder',
      justificativaLabel: just || 'Líder informou: colaborador no plantão de outro gerente nesta semana.',
      faltaInjustificada: false,
      isenta: false,
      foraPlantao: true,
      ferias: false,
      legado: false,
    };
  }

  if (assiduidadeLegacySemanalRemovida(a)) {
    return {
      mediaLabel: 'Registro antigo',
      justificativaLabel: just || 'Tipo de assiduidade descontinuado (folga/escala). Edite se precisar.',
      faltaInjustificada: false,
      isenta: false,
      foraPlantao: false,
      ferias: false,
      legado: true,
    };
  }

  return {
    mediaLabel: l.media_dia != null ? Number(l.media_dia).toFixed(2).replace('.', ',') : '—',
    justificativaLabel: just || '—',
    faltaInjustificada: false,
    isenta: false,
    foraPlantao: false,
    ferias: false,
    legado: false,
  };
}

export type ItemDetalheNotaAvaliacao = {
  label: string;
  nota: string;
  destaque?: 'zero' | 'isento' | 'info';
};

export function detalharItensNotaAvaliacaoAdmin(l: {
  assiduidade: string;
  justificativa_nota_baixa?: string | null;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  nota_proatividade?: number | null;
}): ItemDetalheNotaAvaliacao[] {
  const a = assiduidadeDoBanco(l.assiduidade, l.justificativa_nota_baixa);
  const fmt = (n: number | null | undefined) => {
    if (n == null || Number.isNaN(n)) return '—';
    const x = Number(n);
    return Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ',');
  };

  if (a === 'falta_injustificada') {
    return [
      { label: 'Assiduidade', nota: 'Falta injustificada', destaque: 'zero' },
      { label: 'Vestimenta', nota: '0', destaque: 'zero' },
      { label: 'Pontualidade', nota: '0', destaque: 'zero' },
      { label: 'Trabalho em equipe', nota: '0', destaque: 'zero' },
      { label: 'Desempenho de tarefas', nota: '0', destaque: 'zero' },
      { label: 'Proatividade e iniciativa', nota: '0', destaque: 'zero' },
    ];
  }

  if (a === 'ferias') {
    return [
      {
        label: 'Férias',
        nota: 'De férias nesta semana — não entra na média',
        destaque: 'isento',
      },
    ];
  }

  if (a === 'fora_plantao') {
    return [
      {
        label: 'Plantão',
        nota: 'Outro líder avalia nesta semana',
        destaque: 'info',
      },
    ];
  }

  if (assiduidadeLegacySemanalRemovida(a)) {
    return [{ label: 'Semana', nota: 'Registro antigo (folga/escala descontinuados)', destaque: 'info' }];
  }

  const itens: ItemDetalheNotaAvaliacao[] = [
    { label: 'Avaliação', nota: 'Semanal com critérios', destaque: 'info' },
    { label: 'Vestimenta', nota: fmt(l.nota_vestimenta) },
    { label: 'Pontualidade', nota: fmt(l.nota_pontualidade) },
    { label: 'Trabalho em equipe', nota: fmt(l.nota_trabalho_equipe) },
    { label: 'Desempenho de tarefas', nota: fmt(l.nota_desempenho_tarefas) },
    { label: 'Proatividade e iniciativa', nota: fmt(l.nota_proatividade) },
  ];
  return itens;
}
