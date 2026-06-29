/** Setores fixos (local de trabalho). CD substitui o legado «Estoque». */
/** @see listarSetoresCadastro() em @/lib/tenant — porta única para leitura SaaS */
export const SETORES_PREDEFINIDOS = [
  'Cozinha loja',
  'Atendimento',
  'Copa',
  'Caixa',
  'ASG',
  'Fábrica de doces',
  'Fábrica de preparos',
  'Administração',
  'Escritório',
  'CD',
  'Motorista',
  'RH',
  'Supervisão',
  'Marketing',
] as const;

/** Legado — ainda aceito em cadastros antigos; normalizar para CD. */
export const SETOR_ESTOQUE_LEGADO = 'Estoque';

/** Unidades (slug usado no cadastro e na API). Sem Matriz. */
/** @see listarUnidadesCadastro() em @/lib/tenant — porta única para leitura SaaS */
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

/** Perfis cadastráveis via fluxo principal. */
export const ROLES_CADASTRO = ['colaborador', 'gerente', 'rh', 'admin', 'socio'] as const;

/** @deprecated Preferir `isSetorCadastroValido` de `@/lib/tenant/org-catalog`. */
export function isSetorValido(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return false;
  const t = s.trim();
  if (t === SETOR_ESTOQUE_LEGADO) return true;
  return (SETORES_PREDEFINIDOS as readonly string[]).includes(t);
}

/** @deprecated Preferir `isUnidadeSlugCadastroValido` de `@/lib/tenant/org-catalog`. */
export function isUnidadeSlugValido(slug: string): boolean {
  return UNIDADES_CADASTRO.some((u) => u.slug === slug);
}

/** Setores backoffice: na avaliação semanal do líder transversal, gerente/admin do setor também entram na lista. */
export const SETORES_AVALIACAO_EQUIPE_BACKOFFICE = [
  'CD',
  'Escritório',
  'Motorista',
  'Administração',
  'RH',
] as const;
