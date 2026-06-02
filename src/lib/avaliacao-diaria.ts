/**
 * Regras: falta injustificada → média 0 e os 4 critérios em 0 (assiduidade = 0 no somatório);
 * folga/outra escala/falta justificada → isento (média null, não entra na média mensal);
 * presente → assiduidade conta como 5 estrelas (compareceu) + 4 critérios 1–5 → média = soma/5.
 */

export type AssiduidadeTipo =
  | 'presente'
  | 'folga'
  | 'outra_escala'
  | 'falta_justificada'
  | 'falta_injustificada';

export type NotasCriterios = {
  vestimenta: number | null;
  pontualidade: number | null;
  trabalhoEquipe: number | null;
  desempenhoTarefas: number | null;
};

/** Contribuição numérica da assiduidade no somatório dos 5 critérios (1–5 estrelas). */
export function notaAssiduidadeNumerica(assiduidade: AssiduidadeTipo): number | null {
  if (assiduidade === 'presente') return 5;
  if (assiduidade === 'falta_injustificada') return 0;
  return null;
}

/** Média do dia conforme regras; null = isento (folga/outra escala/falta justificada). */
export function calcularMediaDia(
  assiduidade: AssiduidadeTipo,
  notas: NotasCriterios
): { media: number | null; notasPersistidas: NotasCriterios } {
  if (assiduidade === 'falta_justificada' || assiduidade === 'folga' || assiduidade === 'outra_escala') {
    return {
      media: null,
      notasPersistidas: {
        vestimenta: null,
        pontualidade: null,
        trabalhoEquipe: null,
        desempenhoTarefas: null,
      },
    };
  }
  if (assiduidade === 'falta_injustificada') {
    return {
      media: 0,
      notasPersistidas: {
        vestimenta: 0,
        pontualidade: 0,
        trabalhoEquipe: 0,
        desempenhoTarefas: 0,
      },
    };
  }
  const v = notas.vestimenta;
  const p = notas.pontualidade;
  const e = notas.trabalhoEquipe;
  const d = notas.desempenhoTarefas;
  if (v == null || p == null || e == null || d == null) {
    return { media: null, notasPersistidas: { ...notas } };
  }
  const soma = 5 + v + p + e + d;
  const media = Math.round((soma / 5) * 100) / 100;
  return {
    media,
    notasPersistidas: { vestimenta: v, pontualidade: p, trabalhoEquipe: e, desempenhoTarefas: d },
  };
}

export type LinhaMediaMensal = { media_dia: number | null };

/**
 * Média mensal: ignora dias isentos (media_dia null).
 * Inclui zeros (falta injustificada). Se não houver dias válidos, retorna null.
 */
export function calcularMediaMensal(linhas: LinhaMediaMensal[]): number | null {
  const valores = linhas.map((l) => l.media_dia).filter((m): m is number => m !== null && !Number.isNaN(m));
  if (valores.length === 0) return null;
  const soma = valores.reduce((a, b) => a + b, 0);
  return Math.round((soma / valores.length) * 100) / 100;
}

/** Texto de média e justificativa para relatório admin (sem coluna assiduidade). */
export function formatarExibicaoAvaliacaoAdmin(l: {
  assiduidade: string;
  media_dia: number | null;
  justificativa_nota_baixa?: string | null;
}): {
  mediaLabel: string;
  justificativaLabel: string;
  faltaInjustificada: boolean;
  isenta: boolean;
} {
  const just = String(l.justificativa_nota_baixa ?? '').trim();
  const a = String(l.assiduidade ?? '').trim();

  if (a === 'falta_injustificada') {
    return {
      mediaLabel: '0,00',
      justificativaLabel: just
        ? `Falta injustificada — média zerada. ${just}`
        : 'Falta injustificada — média zerada.',
      faltaInjustificada: true,
      isenta: false,
    };
  }

  if (a === 'falta_justificada') {
    return {
      mediaLabel: 'Isenta',
      justificativaLabel: just || 'Semana isenta (folga, outra escala ou falta justificada).',
      faltaInjustificada: false,
      isenta: true,
    };
  }

  return {
    mediaLabel: l.media_dia != null ? Number(l.media_dia).toFixed(2).replace('.', ',') : '—',
    justificativaLabel: just || '—',
    faltaInjustificada: false,
    isenta: false,
  };
}

export type ItemDetalheNotaAvaliacao = {
  label: string;
  nota: string;
  destaque?: 'zero' | 'isento';
};

function fmtNota(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return String(n);
}

/** Critérios item a item para gaveta admin (sócio / Daniel). */
export function detalharItensNotaAvaliacaoAdmin(l: {
  assiduidade: string;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
}): ItemDetalheNotaAvaliacao[] {
  const a = String(l.assiduidade ?? '').trim();

  if (a === 'falta_injustificada') {
    return [
      { label: 'Presença (assiduidade)', nota: '0', destaque: 'zero' },
      { label: 'Vestimenta', nota: '0', destaque: 'zero' },
      { label: 'Pontualidade', nota: '0', destaque: 'zero' },
      { label: 'Trabalho em equipe', nota: '0', destaque: 'zero' },
      { label: 'Desempenho de tarefas', nota: '0', destaque: 'zero' },
    ];
  }

  if (a === 'falta_justificada') {
    return [{ label: 'Semana', nota: 'Isenta (folga, outra escala ou falta justificada)', destaque: 'isento' }];
  }

  return [
    { label: 'Presença (assiduidade)', nota: '5' },
    { label: 'Vestimenta', nota: fmtNota(l.nota_vestimenta) },
    { label: 'Pontualidade', nota: fmtNota(l.nota_pontualidade) },
    { label: 'Trabalho em equipe', nota: fmtNota(l.nota_trabalho_equipe) },
    { label: 'Desempenho de tarefas', nota: fmtNota(l.nota_desempenho_tarefas) },
  ];
}
