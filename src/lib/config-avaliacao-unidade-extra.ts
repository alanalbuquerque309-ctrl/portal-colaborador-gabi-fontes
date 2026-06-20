/**
 * Avaliadores que, temporariamente, veem colaboradores de outra unidade na «Avaliação da equipe».
 * Remover a regra quando não precisar mais.
 */

export type RegraUnidadeExtraTemporaria = {
  lideres_nomes: string[];
  unidade_slug: string;
  motivo?: string;
};

/** Coberturas temporárias — vazio desde jun/2026 (Nova Iguaçu com Vanessa + Nathalia). */
export const REGRAS_UNIDADE_EXTRA_TEMPORARIA: RegraUnidadeExtraTemporaria[] = [];
