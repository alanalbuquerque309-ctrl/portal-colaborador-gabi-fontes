import 'server-only';

import { getTenantBranding } from '@/lib/tenant/branding';
import { getModulosTenant } from '@/lib/tenant/modulos';
import { listarSetoresCadastro, listarUnidadesCadastro } from '@/lib/tenant/org-catalog';
import {
  carregarTenantMirrorDb,
  getModulosTenantServer,
  getTenantBrandingServer,
  getTenantSlug,
  getTermosTenantServer,
  listarSetoresCadastroServer,
  listarUnidadesCadastroServer,
  tenantEspelho061Disponivel,
  useTenantDbMirror,
} from '@/lib/tenant/settings-server';
import { getTermosTenant } from '@/lib/tenant/terminology';
import type { TenantEspelhoAdminPainel, TenantModulos } from '@/lib/tenant/types';

function listasIguais(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function modulosIguais(a: TenantModulos, b: Partial<TenantModulos> | TenantModulos): boolean {
  const keys = Object.keys(a) as (keyof TenantModulos)[];
  return keys.every((k) => a[k] === (b[k] ?? a[k]));
}

/** Painel read-only: runtime efetivo vs legado TS vs espelho Supabase (061). */
export async function montarPainelTenantEspelhoAdmin(): Promise<TenantEspelhoAdminPainel> {
  const slug = getTenantSlug();
  const useTenantDb = useTenantDbMirror();

  const [
    espelho061,
    espelhoDb,
    runtimeBranding,
    runtimeTermos,
    runtimeModulos,
    runtimeSetores,
    runtimeUnidades,
  ] = await Promise.all([
    tenantEspelho061Disponivel(),
    carregarTenantMirrorDb(slug),
    getTenantBrandingServer(),
    getTermosTenantServer(),
    getModulosTenantServer(),
    listarSetoresCadastroServer(),
    listarUnidadesCadastroServer(),
  ]);

  const legadoBranding = getTenantBranding();
  const legadoTermos = getTermosTenant();
  const legadoModulos = getModulosTenant();
  const legadoSetores = [...listarSetoresCadastro()];
  const legadoUnidades = [...listarUnidadesCadastro()];

  const espelhoNormalizado = espelhoDb
    ? {
        tenant_id: espelhoDb.tenantId,
        slug: espelhoDb.slug,
        nome_exibicao: espelhoDb.nomeExibicao,
        branding: espelhoDb.branding as Record<string, string | undefined>,
        termos: espelhoDb.termos as Record<string, string>,
        modulos: espelhoDb.modulos,
        setores: espelhoDb.setores,
      }
    : null;

  const runtimeDiferenteLegado =
    JSON.stringify(runtimeBranding) !== JSON.stringify(legadoBranding) ||
    JSON.stringify(runtimeTermos) !== JSON.stringify(legadoTermos) ||
    !modulosIguais(runtimeModulos, legadoModulos) ||
    !listasIguais(runtimeSetores, legadoSetores) ||
    JSON.stringify(runtimeUnidades) !== JSON.stringify(legadoUnidades);

  return {
    slug,
    use_tenant_db: useTenantDb,
    espelho_061_disponivel: espelho061,
    fonte_runtime: useTenantDb ? 'db_mirror' : 'legado_env_defaults',
    runtime: {
      branding: runtimeBranding,
      termos: runtimeTermos,
      modulos: runtimeModulos,
      setores: runtimeSetores,
      unidades: runtimeUnidades,
    },
    legado_codigo: {
      branding: legadoBranding,
      termos: legadoTermos,
      modulos: legadoModulos,
      setores: legadoSetores,
      unidades: legadoUnidades,
    },
    espelho_db: espelhoNormalizado,
    comparacao: {
      espelho_alinhado_legado_setores: espelhoNormalizado
        ? listasIguais(espelhoNormalizado.setores, legadoSetores)
        : null,
      espelho_alinhado_legado_modulos: espelhoNormalizado
        ? modulosIguais(legadoModulos, espelhoNormalizado.modulos)
        : null,
      runtime_diferente_legado: runtimeDiferenteLegado,
    },
  };
}
