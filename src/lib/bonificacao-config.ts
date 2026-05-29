/** Pesos do índice de mérito (soma = 1). Ajuste interno; não exibir na UI do colaborador. */
export const BONIFICACAO_PESO_AVALIACAO_LIDER = 0.5;
export const BONIFICACAO_PESO_TROFEUS = 0.25;
export const BONIFICACAO_PESO_PRESENCA = 0.25;

/** Novato (não apto na função) recebe esta fração do índice calculado. */
export const BONIFICACAO_FATOR_NOVATO = 0.5;

/** Penalidades rígidas sobre o fator de repasse (1 = sem corte por falta/atraso nesta camada). */
export const BONIFICACAO_1_FALTA_INJ_FATOR = 0.5;
export const BONIFICACAO_2_FALTAS_INJ_FATOR = 0;

/** Atendimento: descontos fixos em reais por semana com ocorrência (aproximação semanal). */
export const BONIFICACAO_ATENDIMENTO_DESCONTO_FALTA_INJ = 100;
export const BONIFICACAO_ATENDIMENTO_DESCONTO_ATESTADO = 50;

/** Demais setores: desconto fixo por semana com atestado/falta justificada. */
export const BONIFICACAO_GERAL_DESCONTO_ATESTADO_SEMANA = 50;

export function setorEhAtendimento(setor: string | null | undefined): boolean {
  const s = String(setor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return s === 'atendimento';
}
