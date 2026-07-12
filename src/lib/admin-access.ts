import { normalizePortalRole } from '@/lib/roles';

export type AdminNivelAcesso = 'full' | 'rh_limitado' | 'senha';

/** Menu admin para RH (Keila): sem avaliações internas, gorjeta, sugestões, etc. */
export const ADMIN_NAV_RH: readonly { href: string; label: string }[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/evolucao', label: 'Saúde da equipe' },
  { href: '/admin/colaboradores', label: 'Colaboradores' },
  { href: '/admin/rotatividade', label: 'Rotatividade' },
  { href: '/admin/redefinicoes-senha', label: 'Redefinições de senha' },
  { href: '/admin/termometro-emocoes', label: 'Termômetro de emoções' },
  { href: '/admin/lideres-por-setor', label: 'Liderança por setor' },
  { href: '/admin/avisos', label: 'Avisos' },
  { href: '/admin/sugestoes', label: 'Sugestões' },
  { href: '/admin/cafe-conecta', label: 'Café Conecta' },
  { href: '/admin/treinamento', label: 'Treinamento' },
  { href: '/admin/escalas', label: 'Escalas' },
  { href: '/portal/ajuda-inbox', label: 'Inbox ajuda' },
];

export const ADMIN_PATHS_RH: readonly string[] = ADMIN_NAV_RH.filter((i) =>
  i.href.startsWith('/admin')
).map((i) => i.href);

export function isRoleAdminCompleto(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master' || r === 'gerente';
}

export function isRoleAdminRh(role: string | null | undefined): boolean {
  return normalizePortalRole(role) === 'rh';
}

/** Portal + APIs: quem pode abrir /admin (completo ou RH limitado). */
export function podeAcessarAdminPortal(role: string | null | undefined): boolean {
  return isRoleAdminCompleto(role) || isRoleAdminRh(role);
}

export function resolveAdminNivel(
  role: string | null | undefined,
  senhaAdmin: boolean
): AdminNivelAcesso | null {
  if (senhaAdmin) return 'senha';
  if (isRoleAdminCompleto(role)) return 'full';
  if (isRoleAdminRh(role)) return 'rh_limitado';
  return null;
}

export function adminPathPermitidoRh(pathname: string | null | undefined): boolean {
  const p = (pathname ?? '').replace(/\/$/, '') || '/admin/dashboard';
  if (ADMIN_PATHS_RH.some((base) => p === base || p.startsWith(`${base}/`))) return true;
  if (p === '/portal/ajuda-inbox' || p.startsWith('/portal/ajuda-inbox/')) return true;
  return false;
}

/** Editar folgas/escalas no admin: sócios, admin (Daniel), RH (Keila) ou senha. */
export function podeEditarEscalasAdmin(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  if (senhaAdmin) return true;
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'rh';
}

/** Sócios, admin e login por senha: editar mapa completo e aplicar padrão operacional. */
export function podeEditarLiderancaMapaCompleto(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  if (senhaAdmin) return true;
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}

/**
 * Admin (Daniel), RH (Keila), sócios e login por senha podem criar/editar/excluir cadastros.
 * Gerentes/líderes ficam de fora — permissão por cargo, não por pessoa.
 */
export function podeEditarCadastroColaborador(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  if (senhaAdmin) return true;
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'rh';
}

/**
 * Aviso laranja de admissão faltando: só Admin (Daniel) e RH.
 * Sócios/gerentes não veem o banner (não trava ninguém).
 */
export function podeVerAvisoAdmissaoPendente(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  if (senhaAdmin) return true;
  const r = normalizePortalRole(role);
  return r === 'admin' || r === 'rh';
}

/** Painel de rotatividade (contratações/demissões): quem edita cadastro. */
export function podeVerRotatividade(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  return podeEditarCadastroColaborador(role, senhaAdmin);
}

/** Admin (Daniel), RH (Keila), sócios e login por senha podem corrigir CPF. */
export function podeEditarCpfColaboradorAdmin(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  return podeEditarCadastroColaborador(role, senhaAdmin);
}

/** Sócios, admin (Daniel) e login por senha: detalhe item a item das notas no admin. */
export function podeVerDetalheNotasAvaliacaoAdmin(
  role: string | null | undefined,
  senhaAdmin: boolean
): boolean {
  if (senhaAdmin) return true;
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}

/** Trilha de auditoria: sócios, admin (Daniel) e login por senha. Não inclui RH nem gerente. */
export function podeVerAuditoria(role: string | null | undefined, senhaAdmin: boolean): boolean {
  if (senhaAdmin) return true;
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}

export function labelNivelAdmin(nivel: AdminNivelAcesso | null): string {
  if (nivel === 'rh_limitado') return 'RH (acesso limitado)';
  if (nivel === 'senha') return 'Administrador';
  if (nivel === 'full') return 'Gestão completa';
  return '';
}
