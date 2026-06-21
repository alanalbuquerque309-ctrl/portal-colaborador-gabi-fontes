import { canResponderAjudaPorId, normalizePortalRole } from '@/lib/roles';
import { isSocioNegocioPorNome } from '@/lib/socios-negocio';

/** Alan Albuquerque — CPF no cadastro Supabase. */
export const CPF_ALAN_AUDITORIA = '05376259765';

/** IDs fixos de sócios (produção). */
export const IDS_AUDITORIA_LIDERANCA_FIXOS = new Set([
  '78db7f2d-8ee9-4124-aad9-fa688983d995',
]);

export function normalizarCpfAuditoria(cpf: string | null | undefined): string {
  const digits = String(cpf ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(11, '0').slice(-11);
}

function cpfsAuditoriaEnv(): Set<string> {
  const raw = (process.env.PORTAL_AUDITORIA_LIDERANCA_CPFS || '').trim();
  const out = new Set<string>([normalizarCpfAuditoria(CPF_ALAN_AUDITORIA)]);
  for (const part of raw.split(',')) {
    const n = normalizarCpfAuditoria(part);
    if (n) out.add(n);
  }
  return out;
}

function idsAuditoriaEnv(): Set<string> {
  const raw = (
    process.env.PORTAL_AUDITORIA_LIDERANCA_IDS ||
    process.env.NEXT_PUBLIC_PORTAL_AUDITORIA_LIDERANCA_IDS ||
    ''
  ).trim();
  const out = new Set(IDS_AUDITORIA_LIDERANCA_FIXOS);
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (id) out.add(id);
  }
  return out;
}

export type ViewerAuditoriaLideranca = {
  colaboradorId?: string | null;
  roleDb?: string | null;
  roleCookie?: string | null;
  nome?: string | null;
  cpf?: string | null;
};

/** Decide se o viewer vê quem avaliou (inclusive anônimos). */
export function viewerTemAuditoriaLideranca(viewer: ViewerAuditoriaLideranca): boolean {
  const id = String(viewer.colaboradorId ?? '').trim();
  const cpf = normalizarCpfAuditoria(viewer.cpf);
  const nome = String(viewer.nome ?? '').trim();
  const roleDb = normalizePortalRole(viewer.roleDb);
  const roleCookie = normalizePortalRole(viewer.roleCookie);

  const cpfOk = cpf && cpfsAuditoriaEnv().has(cpf);
  const idOk = id && idsAuditoriaEnv().has(id);
  const nomeOk = isSocioNegocioPorNome(nome);
  const roleOk = roleDb === 'socio' || roleCookie === 'socio';
  const socioNegocio = cpfOk || idOk || nomeOk || roleOk;

  if (canResponderAjudaPorId(id) && !socioNegocio) return false;

  return Boolean(socioNegocio);
}
