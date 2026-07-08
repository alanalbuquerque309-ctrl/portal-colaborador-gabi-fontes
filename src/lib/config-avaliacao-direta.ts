/**
 * Avaliação semanal da equipe: vínculos por nome (Alan).
 * `exclusivo`: só os avaliadores listados veem esses alvos; gerentes de loja e Visita RH não entram.
 */

export type RegraAvaliacaoDireta = {
  avaliadores_nomes: string[];
  colaboradores_nomes: string[];
  exclusivo?: boolean;
};

export const REGRAS_AVALIACAO_DIRETA: RegraAvaliacaoDireta[] = [
  {
    avaliadores_nomes: ['Gabriela Fontes', 'Gabriela'],
    colaboradores_nomes: [
      'Thaís Mathias',
      'Thais Mathias',
      'Lucas Gomes',
      'Lucas Geova',
    ],
    exclusivo: true,
  },
  {
    avaliadores_nomes: ['Daniel Martins', 'Daniel Brito', 'Daniel'],
    colaboradores_nomes: ['Keila Campos', 'Keila'],
    exclusivo: true,
  },
];
