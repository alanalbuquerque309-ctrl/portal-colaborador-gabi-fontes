import {
  calcularMediaDia,
  temNotaBaixaEquipe,
  type AssiduidadeTipo,
  type NotasCriterios,
} from '@/lib/avaliacao-diaria';
import { notaCriterioValida } from '@/lib/avaliacao-notas';
import {
  assiduidadeParaBanco,
  JUSTIFICATIVA_FERIAS,
  JUSTIFICATIVA_FORA_PLANTAO,
} from '@/lib/avaliacao-semanal-shared';

export type BodyAvaliacaoSemanal = {
  data_referencia?: string;
  colaborador_id?: string;
  assiduidade?: string;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  nota_proatividade?: number | null;
  justificativa_nota_baixa?: string;
};

export function isAssiduidadeSemanal(s: string): s is AssiduidadeTipo {
  return (
    s === 'presente' ||
    s === 'fora_plantao' ||
    s === 'falta_injustificada' ||
    s === 'folga' ||
    s === 'outra_escala' ||
    s === 'falta_justificada'
  );
}

function assiduidadePermitidaNovoEnvio(s: string): s is AssiduidadeTipo {
  return (
    s === 'presente' ||
    s === 'fora_plantao' ||
    s === 'ferias' ||
    s === 'falta_injustificada' ||
    s === 'falta_justificada'
  );
}

/** Semana sem nota: fora do plantão, férias e falta justificada não exigem critérios. */
function assiduidadeSemNota(s: AssiduidadeTipo): boolean {
  return s === 'fora_plantao' || s === 'ferias' || s === 'falta_justificada';
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
  if (!assiduidadePermitidaNovoEnvio(assidRaw)) {
    return {
      ok: false,
      status: 400,
      erro: 'Tipo de assiduidade descontinuado. Use presente, falta justificada, falta injustificada, férias ou fora do plantão.',
    };
  }

  const notasEntrada: NotasCriterios = {
    vestimenta: body.nota_vestimenta ?? null,
    pontualidade: body.nota_pontualidade ?? null,
    trabalhoEquipe: body.nota_trabalho_equipe ?? null,
    desempenhoTarefas: body.nota_desempenho_tarefas ?? null,
    proatividade: body.nota_proatividade ?? null,
  };

  const { media, notasPersistidas } = calcularMediaDia(assidRaw, notasEntrada);
  const semNota = assiduidadeSemNota(assidRaw);
  const temNotaBaixa = !semNota && temNotaBaixaEquipe(assidRaw, notasPersistidas);
  const justificativaFinal =
    assidRaw === 'fora_plantao'
      ? JUSTIFICATIVA_FORA_PLANTAO
      : assidRaw === 'ferias'
        ? JUSTIFICATIVA_FERIAS
        : justificativaNotaBaixa;

  if (temNotaBaixa && justificativaFinal.length < 10) {
    return {
      ok: false,
      status: 400,
      erro: 'Explique em poucas palavras o motivo da nota 3 ou menor.',
    };
  }
  if (justificativaFinal.length > 500) {
    return {
      ok: false,
      status: 400,
      erro: 'Justificativa muito longa (máx. 500 caracteres).',
    };
  }

  if (assidRaw === 'presente') {
    const campos = [
      notasPersistidas.vestimenta,
      notasPersistidas.pontualidade,
      notasPersistidas.trabalhoEquipe,
      notasPersistidas.desempenhoTarefas,
      notasPersistidas.proatividade,
    ];
    if (!campos.every((n) => notaCriterioValida(n))) {
      return {
        ok: false,
        status: 400,
        erro: 'Com presença, informe os cinco critérios de 1 a 5 (meio em meio ponto).',
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
      nota_proatividade: notasPersistidas.proatividade,
      media_dia: media,
      justificativa_nota_baixa:
        assidRaw === 'fora_plantao'
          ? JUSTIFICATIVA_FORA_PLANTAO
          : assidRaw === 'ferias'
            ? JUSTIFICATIVA_FERIAS
            : assidRaw === 'falta_justificada'
              ? justificativaFinal || null
              : temNotaBaixa
                ? justificativaFinal
                : null,
    },
  };
}
