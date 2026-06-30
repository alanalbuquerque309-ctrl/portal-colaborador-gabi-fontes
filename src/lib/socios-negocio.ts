import { nomeCoincide } from '@/lib/nome-coincide';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Sócios de negócio (família/diretoria) — não são líderes operacionais nem entram no ILI.
 * Daniel (admin) fica de fora desta lista.
 */
export const SOCIOS_NEGOCIO_NOMES = [
  'Alan Albuquerque',
  'Alan',
  'Gabriela Fontes',
  'Gabriela',
  'Daniele Aparecida',
  'Daniele Fontes Barbosa',
  'Hilton Jorge',
  'Hilton',
] as const;

export function isSocioNegocioPorNome(nome: string | null | undefined): boolean {
  const n = String(nome ?? '').trim();
  if (!n) return false;
  return SOCIOS_NEGOCIO_NOMES.some((padrao) => nomeCoincide(n, padrao));
}

export function isSocioNegocioColaborador(col: {
  nome?: string | null;
  role?: string | null;
}): boolean {
  if (normalizePortalRole(col.role) === 'socio') return true;
  return isSocioNegocioPorNome(col.nome);
}

/**
 * Sócios não entram no semáforo «Você tem pendências», painel de líder nem cobrança de
 * avaliar equipe/treino. Monitoramento da rede continua em Admin e em «Pendências rede».
 */
export function socioIsentoObrigacoesOperacionaisPortal(col: {
  nome?: string | null;
  role?: string | null;
}): boolean {
  return isSocioNegocioColaborador(col);
}
