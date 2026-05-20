/**
 * Mapa operacional acordado (Alan). Aplicar via POST /api/admin/lideres-por-setor/aplicar-padrao.
 * Nomes são resolvidos para UUID em `aplicar-config-lideranca.ts` (match por unidade quando aplicável).
 *
 * Gerentes da unidade (responsáveis pela loja): `unidade_todos` → setor `*` na unidade.
 * Daniel: CD, Motorista, Administração, RH em todas as unidades de loja/fábrica; unidade Administrativo = `*`.
 */

export type RegraLiderancaOperacional =
  | { tipo: 'unidade_todos'; unidade_slug: string; lideres_nomes: string[] }
  | { tipo: 'unidade_setor'; unidade_slug: string; setor: string; lideres_nomes: string[] }
  | { tipo: 'setor_todas_unidades'; setor: string; lideres_nomes: string[] };

/** Nome canónico do líder transversal (CD, Motorista, Administração, RH). */
export const LIDER_TRANSVERSAL_CD_NOME = 'Daniel Martins';

/** Setores em que só Daniel (transversal) deve aparecer, por unidade de loja/fábrica. */
export const SETORES_LIDERANCA_DANIEL_TRANSVERSAL = [
  'CD',
  'Motorista',
  'Administração',
  'RH',
] as const;

/** Ordem: regras mais específicas depois das amplas; aplicação faz upsert sem apagar outras. */
export const REGRAS_LIDERANCA_OPERACIONAL: RegraLiderancaOperacional[] = [
  // —— Gerentes responsáveis por cada unidade (todas as áreas da loja) ——
  {
    tipo: 'unidade_todos',
    unidade_slug: 'barra',
    lideres_nomes: ['Lucas Diniz', 'Matheus Morais'],
  },
  {
    tipo: 'unidade_todos',
    unidade_slug: 'nova-iguacu',
    lideres_nomes: ['Nathalia Pereira Luna', 'Cristina Batista'],
  },
  {
    tipo: 'unidade_todos',
    unidade_slug: 'mesquita',
    lideres_nomes: ['Joyce', 'Silvia'],
  },
  // Atendimento explícito (evita líder transversal errado só neste setor)
  {
    tipo: 'unidade_setor',
    unidade_slug: 'mesquita',
    setor: 'Atendimento',
    lideres_nomes: ['Joyce', 'Silvia'],
  },
  {
    tipo: 'unidade_setor',
    unidade_slug: 'barra',
    setor: 'Atendimento',
    lideres_nomes: ['Lucas Diniz', 'Matheus Morais'],
  },
  {
    tipo: 'unidade_setor',
    unidade_slug: 'nova-iguacu',
    setor: 'Atendimento',
    lideres_nomes: ['Nathalia Pereira Luna', 'Cristina Batista'],
  },
  {
    tipo: 'unidade_setor',
    unidade_slug: 'mesquita',
    setor: 'ASG',
    lideres_nomes: ['Joyce', 'Silvia'],
  },
  {
    tipo: 'unidade_setor',
    unidade_slug: 'fabrica',
    setor: 'Fábrica de preparos',
    lideres_nomes: ['Joyce', 'Silvia'],
  },
  {
    tipo: 'unidade_setor',
    unidade_slug: 'fabrica',
    setor: 'Fábrica de doces',
    lideres_nomes: ['Sabrina', 'Henrique'],
  },
  // —— Daniel: CD, Motorista, Administração, RH (todas as unidades cadastradas) ——
  ...SETORES_LIDERANCA_DANIEL_TRANSVERSAL.map(
    (setor): RegraLiderancaOperacional => ({
      tipo: 'setor_todas_unidades',
      setor,
      lideres_nomes: [LIDER_TRANSVERSAL_CD_NOME],
    })
  ),
  {
    tipo: 'unidade_todos',
    unidade_slug: 'administrativo',
    lideres_nomes: [LIDER_TRANSVERSAL_CD_NOME],
  },
];
