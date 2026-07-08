import 'server-only';

import { getTenantBranding } from '@/lib/tenant/branding';
import { getModulosTenant } from '@/lib/tenant/modulos';
import { listarSetoresCadastro, listarUnidadesCadastro } from '@/lib/tenant/org-catalog';
import {
  carregarRegrasAvaliacaoDiretaLegado,
  carregarRegrasLiderancaLegado,
} from '@/lib/tenant/regras-legado';
import {
  parseRegrasAvaliacaoDiretaMirror,
  parseRegrasLiderancaMirror,
} from '@/lib/tenant/regras-mirror-parse';
import {
  carregarTenantMirrorDb,
  getModulosTenantServer,
  getTenantBrandingServer,
  getTenantSlug,
  getTermosTenantServer,
  listarSetoresCadastroServer,
  listarUnidadesCadastroServer,
  tenantEspelho061Disponivel,
  tenantEspelho062Disponivel,
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

function regrasJsonIguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Painel read-only: runtime efetivo vs legado TS vs espelho Supabase (061/062). */
export async function montarPainelTenantEspelhoAdmin(): Promise<TenantEspelhoAdminPainel> {
  const slug = getTenantSlug();
  const useTenantDb = useTenantDbMirror();
  const legadoRegrasLideranca = carregarRegrasLiderancaLegado();
  const legadoRegrasAvaliacao = carregarRegrasAvaliacaoDiretaLegado();

  const [
    espelho061,
    espelho062,
    espelhoDb,
    runtimeBranding,
    runtimeTermos,
    runtimeModulos,
    runtimeSetores,
    runtimeUnidades,
  ] = await Promise.all([
    tenantEspelho061Disponivel(),
    tenantEspelho062Disponivel(),
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

  const espelhoRegrasLideranca = parseRegrasLiderancaMirror(espelhoDb?.regrasLideranca);
  const espelhoRegrasAvaliacao = parseRegrasAvaliacaoDiretaMirror(espelhoDb?.regrasAvaliacaoDireta);

  const espelhoNormalizado = espelhoDb
    ? {
        tenant_id: espelhoDb.tenantId,
        slug: espelhoDb.slug,
        nome_exibicao: espelhoDb.nomeExibicao,
        branding: espelhoDb.branding as Record<string, string | undefined>,
        termos: espelhoDb.termos as Record<string, string>,
        modulos: espelhoDb.modulos,
        setores: espelhoDb.setores,
        regras_lideranca_count: espelhoRegrasLideranca?.length ?? 0,
        regras_avaliacao_direta_count: espelhoRegrasAvaliacao?.length ?? 0,
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
    espelho_062_disponivel: espelho062,
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
    regras_legado: {
      lideranca_count: legadoRegrasLideranca.length,
      avaliacao_direta_count: legadoRegrasAvaliacao.length,
    },
    comparacao: {
      espelho_alinhado_legado_setores: espelhoNormalizado
        ? listasIguais(espelhoNormalizado.setores, legadoSetores)
        : null,
      espelho_alinhado_legado_modulos: espelhoNormalizado
        ? modulosIguais(legadoModulos, espelhoNormalizado.modulos)
        : null,
      espelho_alinhado_legado_regras_lideranca: espelhoRegrasLideranca
        ? regrasJsonIguais(espelhoRegrasLideranca, legadoRegrasLideranca)
        : null,
      espelho_alinhado_legado_regras_avaliacao: espelhoRegrasAvaliacao
        ? regrasJsonIguais(espelhoRegrasAvaliacao, legadoRegrasAvaliacao)
        : null,
      runtime_diferente_legado: runtimeDiferenteLegado,
    },
  };
}
