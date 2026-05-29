import {
  BONIFICACAO_1_FALTA_INJ_FATOR,
  BONIFICACAO_2_FALTAS_INJ_FATOR,
  BONIFICACAO_ATENDIMENTO_DESCONTO_ATESTADO,
  BONIFICACAO_ATENDIMENTO_DESCONTO_FALTA_INJ,
  BONIFICACAO_FATOR_NOVATO,
  BONIFICACAO_GERAL_DESCONTO_ATESTADO_SEMANA,
  BONIFICACAO_PESO_AVALIACAO_LIDER,
  BONIFICACAO_PESO_PRESENCA,
  BONIFICACAO_PESO_TROFEUS,
  setorEhAtendimento,
} from '@/lib/bonificacao-config';

export type SemanaAvaliacao = {
  data_referencia: string;
  assiduidade: string | null;
  media_dia: number | null;
};

export type EntradaIndiceBonificacao = {
  id: string;
  nome: string;
  setor: string | null;
  operacao_apto: boolean;
  semanas: SemanaAvaliacao[];
  trofeus_recebidos_mes: number;
};

export type LinhaIndiceBonificacao = {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  novato: boolean;
  media_avaliacao_mes: number | null;
  semanas_com_avaliacao: number;
  semanas_presente: number;
  faltas_injustificadas_mes: number;
  semanas_atestado_ou_justificada: number;
  trofeus_mes: number;
  indice_merito: number;
  fator_penalidade_falta: number;
  fator_novato: number;
  indice_final: number;
  desconto_fixo_reais: number;
  observacao_interna: string | null;
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function fatorPenalidadeFaltas(faltasInjustificadas: number): number {
  if (faltasInjustificadas >= 2) return BONIFICACAO_2_FALTAS_INJ_FATOR;
  if (faltasInjustificadas === 1) return BONIFICACAO_1_FALTA_INJ_FATOR;
  return 1;
}

export function calcularIndiceBonificacaoColaborador(entrada: EntradaIndiceBonificacao): LinhaIndiceBonificacao {
  const semanas = entrada.semanas;
  const medias = semanas
    .map((s) => s.media_dia)
    .filter((m): m is number => m !== null && !Number.isNaN(m));
  const mediaAval =
    medias.length > 0
      ? Math.round((medias.reduce((a, b) => a + b, 0) / medias.length) * 100) / 100
      : null;

  const semanasPresente = semanas.filter((s) => s.assiduidade === 'presente').length;
  const faltasInj = semanas.filter((s) => s.assiduidade === 'falta_injustificada').length;
  const semanasAtestado = semanas.filter(
    (s) => s.assiduidade === 'falta_justificada'
  ).length;

  const notaNorm = mediaAval != null ? clamp01(mediaAval / 5) : 0;
  const presencaNorm =
    semanas.length > 0 ? clamp01(semanasPresente / semanas.length) : 0;
  const trofeusNorm = clamp01(entrada.trofeus_recebidos_mes / 3);

  const indiceMerito =
    notaNorm * BONIFICACAO_PESO_AVALIACAO_LIDER +
    trofeusNorm * BONIFICACAO_PESO_TROFEUS +
    presencaNorm * BONIFICACAO_PESO_PRESENCA;

  const fatorFalta = fatorPenalidadeFaltas(faltasInj);
  const fatorNovato = entrada.operacao_apto ? 1 : BONIFICACAO_FATOR_NOVATO;
  const indiceFinal = Math.round(indiceMerito * fatorFalta * fatorNovato * 1000) / 1000;

  let descontoFixo = 0;
  const atendimento = setorEhAtendimento(entrada.setor);
  if (atendimento) {
    descontoFixo += faltasInj * BONIFICACAO_ATENDIMENTO_DESCONTO_FALTA_INJ;
    descontoFixo += semanasAtestado * BONIFICACAO_ATENDIMENTO_DESCONTO_ATESTADO;
  } else {
    descontoFixo += semanasAtestado * BONIFICACAO_GERAL_DESCONTO_ATESTADO_SEMANA;
  }

  let observacao: string | null = null;
  if (faltasInj >= 2) observacao = '2+ faltas injustificadas no mês (corte total na camada de falta)';
  else if (faltasInj === 1) observacao = '1 falta injustificada no mês (50% na camada de falta)';

  return {
    colaborador_id: entrada.id,
    nome: entrada.nome,
    setor: entrada.setor,
    novato: !entrada.operacao_apto,
    media_avaliacao_mes: mediaAval,
    semanas_com_avaliacao: semanas.length,
    semanas_presente: semanasPresente,
    faltas_injustificadas_mes: faltasInj,
    semanas_atestado_ou_justificada: semanasAtestado,
    trofeus_mes: entrada.trofeus_recebidos_mes,
    indice_merito: Math.round(indiceMerito * 1000) / 1000,
    fator_penalidade_falta: fatorFalta,
    fator_novato: fatorNovato,
    indice_final: indiceFinal,
    desconto_fixo_reais: descontoFixo,
    observacao_interna: observacao,
  };
}

export function calcularIndicesBonificacao(
  entradas: EntradaIndiceBonificacao[]
): LinhaIndiceBonificacao[] {
  return entradas
    .map(calcularIndiceBonificacaoColaborador)
    .sort((a, b) => b.indice_final - a.indice_final || a.nome.localeCompare(b.nome, 'pt-BR'));
}
