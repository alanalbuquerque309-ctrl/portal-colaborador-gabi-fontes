import { normalizePortalRole } from '@/lib/roles';

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Perfis/cargos que podem ser registados como líder de setor. */
export function podeSerLider(role: string | null | undefined, cargo: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  if (r === 'socio') return false;
  if (r === 'admin' || r === 'gerente' || r === 'master') return true;
  const roleRaw = normalizeText(role);
  if (
    roleRaw.includes('gerente') ||
    roleRaw.includes('sub gerente') ||
    roleRaw.includes('subgerente') ||
    roleRaw.includes('chefe') ||
    roleRaw.includes('confeiteiro') ||
    roleRaw.includes('administrador') ||
    roleRaw.includes('adminisrtador')
  ) {
    return true;
  }
  const c = normalizeText(cargo);
  if (!c) return false;
  return (
    c.includes('gerente') ||
    c.includes('sub gerente') ||
    c.includes('subgerente') ||
    c.includes('chefe') ||
    c.includes('confeiteiro') ||
    c.includes('administrador') ||
    c.includes('adminisrtador')
  );
}
