/** Relatórios consolidados (equipe + feedback sobre liderança). */
import { nomeCoincide } from '@/lib/avaliacao-direta';
import { canResponderAjudaPorId, normalizePortalRole } from '@/lib/roles';

/** Sócios de negócio (fallback se role no cadastro estiver admin). */
const SOCIOS_NEGOCIO_NOMES = ['Alan Albuquerque', 'Alan', 'Gabriela Fontes', 'Gabriela'];

function idsAuditoriaLiderancaEnv(): string[] {
  const raw = (
    process.env.PORTAL_AUDITORIA_LIDERANCA_IDS ||
    process.env.NEXT_PUBLIC_PORTAL_AUDITORIA_LIDERANCA_IDS ||
    ''
  ).trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function podeVerRelatoriosAvaliacoesCompletos(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master' || r === 'gerente';
}

/**
 * Auditoria exclusiva sócios: identidade real de quem avaliou a liderança,
 * inclusive avaliações marcadas como anônimas para o líder.
 * Daniel (canal ajuda) e demais perfis veem «Colaborador (anônimo)».
 */
export function podeAuditarAutorAvaliacaoLideranca(
  role: string | null | undefined,
  colaboradorId?: string | null,
  nome?: string | null
): boolean {
  if (canResponderAjudaPorId(colaboradorId)) return false;
  if (normalizePortalRole(role) === 'socio') return true;
  const id = String(colaboradorId ?? '').trim();
  if (id && idsAuditoriaLiderancaEnv().includes(id)) return true;
  const n = String(nome ?? '').trim();
  if (n && SOCIOS_NEGOCIO_NOMES.some((padrao) => nomeCoincide(n, padrao))) return true;
  return false;
}

/** @deprecated Preferir `podeAuditarAutorAvaliacaoLideranca`. */
export function podeVerAutorAvaliacaoLideranca(
  role: string | null | undefined,
  colaboradorId?: string | null,
  nome?: string | null
): boolean {
  return podeAuditarAutorAvaliacaoLideranca(role, colaboradorId, nome);
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
