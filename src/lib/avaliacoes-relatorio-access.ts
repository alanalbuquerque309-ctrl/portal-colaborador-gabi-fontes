/** Relatórios consolidados (equipe + feedback sobre liderança). */
import { viewerTemAuditoriaLideranca } from '@/lib/auditoria-lideranca-viewer';
import { normalizePortalRole } from '@/lib/roles';

export function podeVerRelatoriosAvaliacoesCompletos(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master' || r === 'gerente';
}

/**
 * Auditoria exclusiva sócios: identidade real de quem avaliou a liderança.
 * @deprecated Preferir `viewerTemAuditoriaLideranca`.
 */
export function podeAuditarAutorAvaliacaoLideranca(
  role: string | null | undefined,
  colaboradorId?: string | null,
  nome?: string | null,
  cpf?: string | null,
  roleCookie?: string | null
): boolean {
  return viewerTemAuditoriaLideranca({
    colaboradorId,
    roleDb: role,
    roleCookie,
    nome,
    cpf,
  });
}

/** @deprecated Preferir `viewerTemAuditoriaLideranca`. */
export function podeVerAutorAvaliacaoLideranca(
  role: string | null | undefined,
  colaboradorId?: string | null,
  nome?: string | null,
  cpf?: string | null,
  roleCookie?: string | null
): boolean {
  return podeAuditarAutorAvaliacaoLideranca(role, colaboradorId, nome, cpf, roleCookie);
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
