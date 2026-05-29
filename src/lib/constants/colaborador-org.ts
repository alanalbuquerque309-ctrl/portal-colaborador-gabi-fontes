/** Setores fixos (local de trabalho). */
export const SETORES_PREDEFINIDOS = [
  'Cozinha loja',
  'Fábrica de doces',
  'Fábrica de preparos',
  'Escritório',
  'CD',
  'Estoque',
  'Atendimento',
  'ASG',
  'Supervisão',
  'Motorista',
  'Marketing',
  'RH',
  'Administração',
] as const;

/** Unidades (slug usado no cadastro e na API). Sem Matriz. */
export const UNIDADES_CADASTRO: { slug: string; label: string }[] = [
  { slug: 'mesquita', label: 'Mesquita' },
  { slug: 'barra', label: 'Barra' },
  { slug: 'nova-iguacu', label: 'Nova Iguaçu' },
  { slug: 'fabrica', label: 'Fábrica' },
  { slug: 'administrativo', label: 'Administrativo' },
];

/** Backoffice central — não entra no agrupamento «por filial» dos relatórios. */
export const SLUG_UNIDADE_ADMINISTRATIVO = 'administrativo' as const;

/** Lojas e pontos operacionais — blocos «por filial» (sem Administrativo). */
export const UNIDADES_RELATORIO_FILIAIS = UNIDADES_CADASTRO.filter(
  (u) => u.slug !== SLUG_UNIDADE_ADMINISTRATIVO
);

/** Perfis cadastráveis via fluxo principal: colaborador, gerente (líder / avaliação da equipe), admin. */
export const ROLES_CADASTRO = ['colaborador', 'gerente', 'admin'] as const;

export function isSetorValido(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return false;
  return (SETORES_PREDEFINIDOS as readonly string[]).includes(s.trim());
}

export function isUnidadeSlugValido(slug: string): boolean {
  return UNIDADES_CADASTRO.some((u) => u.slug === slug);
}

/** Setores backoffice: na avaliação semanal do líder transversal, gerente/admin do setor também entram na lista. */
export const SETORES_AVALIACAO_EQUIPE_BACKOFFICE = [
  'CD',
  'Estoque',
  'Motorista',
  'Administração',
  'RH',
] as const;
