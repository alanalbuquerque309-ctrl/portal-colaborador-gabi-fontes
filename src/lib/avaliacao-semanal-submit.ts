import {
  calcularMediaDia,
  type AssiduidadeTipo,
  type NotasCriterios,
} from '@/lib/avaliacao-diaria';
import { assiduidadeParaBanco } from '@/lib/avaliacao-semanal-shared';

export type BodyAvaliacaoSemanal = {
  data_referencia?: string;
  colaborador_id?: string;
  assiduidade?: string;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  justificativa_nota_baixa?: string;
};

export function isAssiduidadeSemanal(s: string): s is AssiduidadeTipo {
  return (
    s === 'presente' ||
    s === 'folga' ||
    s === 'outra_escala' ||
    s === 'falta_justificada' ||
    s === 'falta_injustificada'
  );
}

export function sanitizeJustificativaSemanal(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export type AvaliacaoSemanalValidada =
  | { ok: true; dataRef: string; colaboradorAlvo: string; assidRaw: AssiduidadeTipo; row: Record<string, unknown>; media: number | null }
  | { ok: false; status: number; erro: string };

export function validarBodyAvaliacaoSemanal(
  body: BodyAvaliacaoSemanal,
  dataRefNormalizada: string
): AvaliacaoSemanalValidada {
  const colaboradorAlvo = String(body.colaborador_id ?? '').trim();
  const assidRaw = String(body.assiduidade ?? '').trim();
  const justificativaNotaBaixa = sanitizeJustificativaSemanal(body.justificativa_nota_baixa);

  if (!colaboradorAlvo || !isAssiduidadeSemanal(assidRaw)) {
    return { ok: false, status: 400, erro: 'Dados obrigatórios inválidos' };
  }

  const notasEntrada: NotasCriterios = {
    vestimenta: body.nota_vestimenta ?? null,
    pontualidade: body.nota_pontualidade ?? null,
    trabalhoEquipe: body.nota_trabalho_equipe ?? null,
    desempenhoTarefas: body.nota_desempenho_tarefas ?? null,
  };

  const { media, notasPersistidas } = calcularMediaDia(assidRaw, notasEntrada);
  const temNotaBaixa =
    assidRaw === 'falta_injustificada' ||
    Object.values(notasPersistidas).some((nota) => typeof nota === 'number' && nota <= 3);

  if (temNotaBaixa && justificativaNotaBaixa.length < 10) {
    return {
      ok: false,
      status: 400,
      erro: 'Explique em poucas palavras o motivo da nota 3 ou menor.',
    };
  }
  if (justificativaNotaBaixa.length > 500) {
    return {
      ok: false,
      status: 400,
      erro: 'Justificativa muito longa (máx. 500 caracteres).',
    };
  }

  if (assidRaw === 'presente') {
    const { vestimenta, pontualidade, trabalhoEquipe, desempenhoTarefas } = notasPersistidas;
    if (
      vestimenta == null ||
      pontualidade == null ||
      trabalhoEquipe == null ||
      desempenhoTarefas == null ||
      vestimenta < 1 ||
      vestimenta > 5 ||
      pontualidade < 1 ||
      pontualidade > 5 ||
      trabalhoEquipe < 1 ||
      trabalhoEquipe > 5 ||
      desempenhoTarefas < 1 ||
      desempenhoTarefas > 5
    ) {
      return {
        ok: false,
        status: 400,
        erro: 'Com presença, informe de 1 a 5 estrelas nos quatro critérios.',
      };
    }
  }

  return {
    ok: true,
    dataRef: dataRefNormalizada,
    colaboradorAlvo,
    assidRaw,
    media,
    row: {
      colaborador_id: colaboradorAlvo,
      data_referencia: dataRefNormalizada,
      assiduidade: assiduidadeParaBanco(assidRaw),
      nota_vestimenta: notasPersistidas.vestimenta,
      nota_pontualidade: notasPersistidas.pontualidade,
      nota_trabalho_equipe: notasPersistidas.trabalhoEquipe,
      nota_desempenho_tarefas: notasPersistidas.desempenhoTarefas,
      media_dia: media,
      justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa : null,
    },
  };
}
