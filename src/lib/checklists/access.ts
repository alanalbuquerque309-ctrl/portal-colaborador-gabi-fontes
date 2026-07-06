import { normalizePortalRole } from '@/lib/roles';

/** Quando `true`, gerentes e masters também acessam checklists (produção). */
export function checklistsLideresAtivos(): boolean {
  return process.env.PORTAL_CHECKLIST_LIDERES_ATIVO === 'true';
}

/** Fase prévia: só sócios testam. Depois: `PORTAL_CHECKLIST_LIDERES_ATIVO=true` na Vercel. */
export function podeAcessarChecklistsOperacionais(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  if (checklistsLideresAtivos()) {
    return r === 'gerente' || r === 'master' || r === 'socio' || r === 'admin';
  }
  return r === 'socio';
}

/** Histórico rede (admin checklists): sócios e admin. */
export function podeVerHistoricoChecklistsRede(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}
