/** Relatórios consolidados (equipe + feedback sobre liderança). */
import { normalizePortalRole } from '@/lib/roles';

export function podeVerRelatoriosAvaliacoesCompletos(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master' || r === 'gerente';
}

/** Exibe nome de quem avaliou (auditoria interna). */
export function podeVerAutorAvaliacaoLideranca(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master';
}

/** Gerente vê só a própria unidade; demais perfis autorizados veem todas as filiais. */
export function relatorioRestringeUnidade(role: string | null | undefined): boolean {
  return normalizePortalRole(role) === 'gerente';
}

/** Feedback de liderança repetido por filial: sócio, master e gerente. Admin usa o bloco global ou /admin/avaliacoes-lideranca. */
export function podeVerLiderancaPorFilialRelatorio(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'master' || r === 'gerente';
}
