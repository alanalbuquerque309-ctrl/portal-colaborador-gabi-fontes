/** Setores fixos (local de trabalho). */
export const SETORES_PREDEFINIDOS = [
  'Cozinha loja',
  'Fábrica de doces',
  'Fábrica de preparos',
  'Escritório',
  'Estoque',
  'Atendimento',
  'ASG',
  'Supervisão',
  'Motorista',
  'Marketing',
] as const;

/** Unidades (slug usado no cadastro e na API). Sem Matriz. */
export const UNIDADES_CADASTRO: { slug: string; label: string }[] = [
  { slug: 'mesquita', label: 'Mesquita' },
  { slug: 'barra', label: 'Barra' },
  { slug: 'nova-iguacu', label: 'Nova Iguaçu' },
  { slug: 'fabrica', label: 'Fábrica' },
  { slug: 'administrativo', label: 'Administrativo' },
];

/** Perfis cadastráveis via fluxo principal: colaborador, gerente (líder / avaliação da equipe), admin. */
export const ROLES_CADASTRO = ['colaborador', 'gerente', 'admin'] as const;

export function isSetorValido(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return false;
  return (SETORES_PREDEFINIDOS as readonly string[]).includes(s.trim());
}

export function isUnidadeSlugValido(slug: string): boolean {
  return UNIDADES_CADASTRO.some((u) => u.slug === slug);
}
