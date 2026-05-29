import { LIDER_TRANSVERSAL_CD_NOME } from '@/lib/config-lideranca-operacional';
import { normalizePortalRole } from '@/lib/roles';

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeSetor(setor: string | null | undefined): string {
  return normalizeText(setor);
}

/** Nomes reconhecidos como avaliadora RH geral (visita a todas as unidades). */
const NOMES_AVALIADOR_RH_GERAL = ['keila campos', 'keila'] as const;

export function nomeEhAvaliadorRhGeral(nome: string | null | undefined): boolean {
  const n = normalizeText(nome);
  return NOMES_AVALIADOR_RH_GERAL.some((p) => n.includes(p));
}

export function nomeEhDanielTransversal(nome: string | null | undefined): boolean {
  return normalizeText(nome) === normalizeText(LIDER_TRANSVERSAL_CD_NOME);
}

export function getAvaliadorRhGeralIdEnv(): string {
  return (
    process.env.AVALIADOR_RH_GERAL_COLABORADOR_ID?.trim() ||
    process.env.NEXT_PUBLIC_AVALIADOR_RH_GERAL_ID?.trim() ||
    ''
  );
}

/** Quem pode usar o fluxo «Visita RH» (rede inteira, complementar ao gerente). */
export function podeAvaliarRhVisitaGeral(p: {
  colaboradorId: string;
  role?: string | null;
  setor?: string | null;
  nome?: string | null;
}): boolean {
  const envId = getAvaliadorRhGeralIdEnv();
  if (envId && p.colaboradorId === envId) return true;
  if (normalizePortalRole(p.role) === 'rh') return true;
  if (normalizeSetor(p.setor) === 'rh' && nomeEhAvaliadorRhGeral(p.nome)) return true;
  return false;
}

export function colaboradorElegivelVisitaRh(
  alvo: { id: string; role?: string | null; nome?: string | null },
  avaliadorId: string
): boolean {
  if (alvo.id === avaliadorId) return false;
  if (normalizePortalRole(alvo.role) === 'socio') return false;
  if (nomeEhDanielTransversal(alvo.nome)) return false;
  return true;
}

/** Avaliação semanal feita via Visita RH (para gorjeta e relatórios). */
export function isAvaliacaoDeVisitaRh(
  avaliadorId: string,
  avaliadorRole: string | null | undefined,
  rhIds: Set<string>
): boolean {
  if (rhIds.has(avaliadorId)) return true;
  return normalizePortalRole(avaliadorRole) === 'rh';
}
