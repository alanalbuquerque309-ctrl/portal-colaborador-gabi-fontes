/**
 * Avaliadores que, temporariamente, veem colaboradores de outra unidade na «Avaliação da equipe».
 * Remover a regra quando não precisar mais.
 */

export type RegraUnidadeExtraTemporaria = {
  lideres_nomes: string[];
  unidade_slug: string;
  motivo?: string;
};

export const REGRAS_UNIDADE_EXTRA_TEMPORARIA: RegraUnidadeExtraTemporaria[] = [
  {
    lideres_nomes: ['Joyce'],
    unidade_slug: 'nova-iguacu',
    motivo: 'Cobertura temporária Nova Iguaçu (Alan, jun/2026)',
  },
];
