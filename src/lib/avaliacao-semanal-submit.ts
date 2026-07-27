import {
  calcularMediaDia,
  temNotaBaixaEquipe,
  type AssiduidadeTipo,
  type NotasCriterios,
} from '@/lib/avaliacao-diaria';
import { notaCriterioValida } from '@/lib/avaliacao-notas';
import { validarDataRetornoAusencia } from '@/lib/avaliacao-retorno-ausencia';
import {
  assiduidadeParaBanco,
  justificativaIndicaLicencaOuAfastamento,
  JUSTIFICATIVA_FERIAS,
  JUSTIFICATIVA_FORA_PLANTAO,
  JUSTIFICATIVA_LICENCA_SEMANA,
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
  /** Retorno previsto (obrigatório em férias e licença). */
  data_retorno_previsto?: string;
};

export function isAssiduidadeSemanal(s: string): s is AssiduidadeTipo {
  return (
    s === 'presente' ||
    s === 'fora_plantao' ||
    s === 'ferias' ||
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

/** Semana sem nota: fora do plantão, férias e licença/afastamento (marcador). */
function assiduidadeSemNota(s: AssiduidadeTipo, justificativa: string): boolean {
  if (s === 'fora_plantao' || s === 'ferias') return true;
  if (s === 'falta_justificada' && justificativaIndicaLicencaOuAfastamento(justificativa)) return true;
  return false;
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
  let justificativaNotaBaixa = sanitizeJustificativaSemanal(body.justificativa_nota_baixa);

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

  // Licença pela UI: assiduidade falta_justificada + marcador (sem notas).
  if (
    assidRaw === 'falta_justificada' &&
    (justificativaNotaBaixa === JUSTIFICATIVA_LICENCA_SEMANA ||
      justificativaIndicaLicencaOuAfastamento(justificativaNotaBaixa))
  ) {
    justificativaNotaBaixa = JUSTIFICATIVA_LICENCA_SEMANA;
  }

  const notasEntrada: NotasCriterios = {
    vestimenta: body.nota_vestimenta ?? null,
    pontualidade: body.nota_pontualidade ?? null,
    trabalhoEquipe: body.nota_trabalho_equipe ?? null,
    desempenhoTarefas: body.nota_desempenho_tarefas ?? null,
    proatividade: body.nota_proatividade ?? null,
  };

  const { media, notasPersistidas } = calcularMediaDia(assidRaw, notasEntrada);
  const semNota = assiduidadeSemNota(assidRaw, justificativaNotaBaixa);
  const temNotaBaixa = !semNota && temNotaBaixaEquipe(assidRaw, notasPersistidas);
  const justificativaFinal =
    assidRaw === 'fora_plantao'
      ? JUSTIFICATIVA_FORA_PLANTAO
      : assidRaw === 'ferias'
        ? JUSTIFICATIVA_FERIAS
        : semNota && justificativaIndicaLicencaOuAfastamento(justificativaNotaBaixa)
          ? JUSTIFICATIVA_LICENCA_SEMANA
          : justificativaNotaBaixa;

  const precisaRetorno = assidRaw === 'ferias' || justificativaFinal === JUSTIFICATIVA_LICENCA_SEMANA;
  const dataRetorno = precisaRetorno ? validarDataRetornoAusencia(body.data_retorno_previsto) : null;
  if (precisaRetorno && !dataRetorno) {
    return {
      ok: false,
      status: 400,
      erro: 'Informe a data de retorno (volta de férias/licença).',
    };
  }

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

  if (!semNota && (assidRaw === 'presente' || assidRaw === 'falta_justificada')) {
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
        erro:
          assidRaw === 'falta_justificada'
            ? 'Com falta justificada, informe os cinco critérios (a nota vale; sem Grãos na semana).'
            : 'Com presença, informe os cinco critérios de 1 a 5 (meio em meio ponto).',
      };
    }
  }

  const mediaFinal = semNota ? null : media;
  const notasFinais = semNota
    ? {
        vestimenta: null,
        pontualidade: null,
        trabalhoEquipe: null,
        desempenhoTarefas: null,
        proatividade: null,
      }
    : notasPersistidas;

  return {
    ok: true,
    dataRef: dataRefNormalizada,
    colaboradorAlvo,
    assidRaw,
    media: mediaFinal,
    row: {
      colaborador_id: colaboradorAlvo,
      data_referencia: dataRefNormalizada,
      assiduidade: assiduidadeParaBanco(assidRaw),
      nota_vestimenta: notasFinais.vestimenta,
      nota_pontualidade: notasFinais.pontualidade,
      nota_trabalho_equipe: notasFinais.trabalhoEquipe,
      nota_desempenho_tarefas: notasFinais.desempenhoTarefas,
      nota_proatividade: notasFinais.proatividade,
      media_dia: mediaFinal,
      justificativa_nota_baixa:
        assidRaw === 'fora_plantao'
          ? JUSTIFICATIVA_FORA_PLANTAO
          : assidRaw === 'ferias'
            ? JUSTIFICATIVA_FERIAS
            : justificativaFinal === JUSTIFICATIVA_LICENCA_SEMANA
              ? JUSTIFICATIVA_LICENCA_SEMANA
              : assidRaw === 'falta_justificada'
                ? justificativaFinal || null
                : temNotaBaixa
                  ? justificativaFinal
                  : null,
      data_retorno_previsto: dataRetorno,
    },
  };
}
