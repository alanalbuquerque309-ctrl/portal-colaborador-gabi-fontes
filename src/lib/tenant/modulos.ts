import { DEFAULT_MODULOS } from '@/lib/tenant/defaults';
import type { TenantModulos } from '@/lib/tenant/types';

/** Módulos ligados no tenant (hoje todos on; futuro: DB ou env). */
export function getModulosTenant(): TenantModulos {
  return { ...DEFAULT_MODULOS };
}

export function moduloTenantAtivo(modulo: keyof TenantModulos): boolean {
  return getModulosTenant()[modulo] === true;
}
