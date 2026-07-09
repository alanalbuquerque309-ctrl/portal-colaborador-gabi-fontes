import { normalizePortalRole } from '@/lib/roles';

/** Legado: mantido para flags de UI; gerentes já entram por cargo. */
export function checklistsLideresAtivos(): boolean {
  return process.env.PORTAL_CHECKLIST_LIDERES_ATIVO !== 'false';
}

/** Preencher checklists no portal: gerente de loja, RH, admin, master e sócio. */
export function podeAcessarChecklistsOperacionais(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'gerente' || r === 'master' || r === 'socio' || r === 'admin' || r === 'rh';
}

/** Histórico / consulta na rede (admin). */
export function podeVerHistoricoChecklistsRede(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin' || r === 'master' || r === 'rh';
}
