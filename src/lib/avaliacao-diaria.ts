/**
 * Regras: falta injustificada → média 0 e os 4 critérios em 0 (assiduidade = 0 no somatório);
 * falta justificada → isento (média null, não entra na média mensal);
 * presente → assiduidade conta como 5 estrelas (compareceu) + 4 critérios 1–5 → média = soma/5.
 */

export type AssiduidadeTipo = 'presente' | 'falta_justificada' | 'falta_injustificada';

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

/** Média do dia conforme regras; null = isento (falta justificada). */
export function calcularMediaDia(
  assiduidade: AssiduidadeTipo,
  notas: NotasCriterios
): { media: number | null; notasPersistidas: NotasCriterios } {
  if (assiduidade === 'falta_justificada') {
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
