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
