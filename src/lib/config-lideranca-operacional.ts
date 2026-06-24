/**
 * Mapa operacional acordado (Alan). Aplicar via POST /api/admin/lideres-por-setor/aplicar-padrao.
 * Nomes são resolvidos para UUID em `aplicar-config-lideranca.ts` (match por unidade quando aplicável).
 *
 * Lojas (Mesquita, Barra, Nova Iguaçu): gerentes em `unidade_todos` (`*`) para plantão 12x36
 * e nos setores Cozinha loja, Atendimento, Copa, Caixa e ASG da filial.
 * Fábrica de preparos (unidade fabrica): Joyce e Silvia. Fábrica de doces: Sabrina e Henrique.
 * Daniel: CD, Escritório, Motorista, Administração, RH (transversal) + unidade Administrativo (`*`).
 * CD e Estoque são a mesma função — usar só CD (Estoque é legado).
 */

import {
  SETORES_ADMINISTRACAO_EMPRESA,
  SETORES_LOJA_FILIAL,
} from '@/lib/lideranca-org';

export type RegraLiderancaOperacional =
  | { tipo: 'unidade_todos'; unidade_slug: string; lideres_nomes: string[] }
  | { tipo: 'unidade_setor'; unidade_slug: string; setor: string; lideres_nomes: string[] }
  | { tipo: 'setor_todas_unidades'; setor: string; lideres_nomes: string[] };

/** Nome canónico do líder transversal (CD, Motorista, Administração, RH, Escritório). */
export const LIDER_TRANSVERSAL_CD_NOME = 'Daniel Martins';

const LIDERES_MESQUITA = ['Joyce', 'Silvia'];
const LIDERES_BARRA = ['Lucas Diniz', 'Matheus Morais'];
const LIDERES_NOVA_IGUACU = [
  'Vanessa',
  'Vanessa Barbosa',
  'Vanessa Barbosa da Silva',
  'Nathalia Pereira Luna',
  'Nathalia',
  'Nathália',
];
const LIDERES_DOCES = ['Sabrina', 'Henrique', 'Luís Henrique', 'Luis Henrique'];
const LIDERES_DANIEL = [
  LIDER_TRANSVERSAL_CD_NOME,
  'Daniel Brito Martins',
  'Daniel Brito',
  'Daniel',
];

/** Setores em que Daniel é chefe direto (transversal em todas as unidades). */
export const SETORES_LIDERANCA_DANIEL_TRANSVERSAL = [...SETORES_ADMINISTRACAO_EMPRESA] as const;

function regrasGerenciaLoja(
  unidade_slug: string,
  lideres_nomes: string[]
): RegraLiderancaOperacional[] {
  return [
    { tipo: 'unidade_todos', unidade_slug, lideres_nomes },
    ...SETORES_LOJA_FILIAL.map(
      (setor): RegraLiderancaOperacional => ({
        tipo: 'unidade_setor',
        unidade_slug,
        setor,
        lideres_nomes,
      })
    ),
  ];
}

/** Ordem: regras mais específicas depois das amplas; aplicação faz upsert sem apagar outras. */
export const REGRAS_LIDERANCA_OPERACIONAL: RegraLiderancaOperacional[] = [
  ...regrasGerenciaLoja('mesquita', LIDERES_MESQUITA),
  ...regrasGerenciaLoja('barra', LIDERES_BARRA),
  ...regrasGerenciaLoja('nova-iguacu', LIDERES_NOVA_IGUACU),

  {
    tipo: 'unidade_setor',
    unidade_slug: 'fabrica',
    setor: 'Fábrica de preparos',
    lideres_nomes: LIDERES_MESQUITA,
  },
  {
    tipo: 'unidade_setor',
    unidade_slug: 'fabrica',
    setor: 'Fábrica de doces',
    lideres_nomes: LIDERES_DOCES,
  },

  ...SETORES_LIDERANCA_DANIEL_TRANSVERSAL.map(
    (setor): RegraLiderancaOperacional => ({
      tipo: 'setor_todas_unidades',
      setor,
      lideres_nomes: LIDERES_DANIEL,
    })
  ),

  {
    tipo: 'unidade_todos',
    unidade_slug: 'administrativo',
    lideres_nomes: LIDERES_DANIEL,
  },
];
