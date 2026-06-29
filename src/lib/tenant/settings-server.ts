import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantBranding, type TenantBranding } from '@/lib/tenant/branding';
import { DEFAULT_TENANT_SLUG } from '@/lib/tenant/defaults';
import { SETORES_PREDEFINIDOS, UNIDADES_CADASTRO } from '@/lib/constants/colaborador-org';
import type { UnidadeCadastro } from '@/lib/tenant/org-catalog';
import { getTermosTenant, type TenantTermoId } from '@/lib/tenant/terminology';
import type { TenantMirrorDb, TenantModulos } from '@/lib/tenant/types';
import { getModulosTenant } from '@/lib/tenant/modulos';

export function getTenantSlug(): string {
  return process.env.TENANT_SLUG?.trim() || process.env.NEXT_PUBLIC_TENANT_SLUG?.trim() || DEFAULT_TENANT_SLUG;
}

export function useTenantDbMirror(): boolean {
  return process.env.USE_TENANT_DB?.trim().toLowerCase() === 'true';
}

/** Carrega espelho no Supabase (opcional; não altera runtime sem USE_TENANT_DB). */
export async function carregarTenantMirrorDb(
  slug: string = getTenantSlug()
): Promise<TenantMirrorDb | null> {
  try {
    const supabase = createAdminClient();
    const { data: tenant, error: errT } = await supabase
      .from('tenants')
      .select('id, slug, nome_exibicao')
      .eq('slug', slug)
      .eq('ativo', true)
      .maybeSingle();

    if (errT || !tenant?.id) return null;

    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('branding, termos, modulos')
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    const { data: setoresRows } = await supabase
      .from('tenant_setores')
      .select('nome, ordem')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    const brandingRaw = (settings?.branding ?? {}) as Record<string, unknown>;
    const termosRaw = (settings?.termos ?? {}) as Record<string, string>;
    const modulosRaw = (settings?.modulos ?? {}) as Partial<TenantModulos>;

    return {
      tenantId: String(tenant.id),
      slug: String(tenant.slug),
      nomeExibicao: String(tenant.nome_exibicao ?? ''),
      branding: {
        displayName: typeof brandingRaw.displayName === 'string' ? brandingRaw.displayName : undefined,
        tagline: typeof brandingRaw.tagline === 'string' ? brandingRaw.tagline : undefined,
        portalTitle: typeof brandingRaw.portalTitle === 'string' ? brandingRaw.portalTitle : undefined,
        logoUrl: typeof brandingRaw.logoUrl === 'string' ? brandingRaw.logoUrl : undefined,
        logoUrlHome: typeof brandingRaw.logoUrlHome === 'string' ? brandingRaw.logoUrlHome : undefined,
        logoAlt: typeof brandingRaw.logoAlt === 'string' ? brandingRaw.logoAlt : undefined,
        pwaShortName: typeof brandingRaw.pwaShortName === 'string' ? brandingRaw.pwaShortName : undefined,
        themeColor: typeof brandingRaw.themeColor === 'string' ? brandingRaw.themeColor : undefined,
        metaDescription:
          typeof brandingRaw.metaDescription === 'string' ? brandingRaw.metaDescription : undefined,
      },
      termos: termosRaw,
      modulos: modulosRaw,
      setores: (setoresRows ?? []).map((r) => String(r.nome)),
    };
  } catch {
    return null;
  }
}

/** Branding: env → (opcional) DB → defaults legado. */
export async function getTenantBrandingServer(): Promise<TenantBranding> {
  const base = getTenantBranding();
  if (!useTenantDbMirror()) return base;

  const mirror = await carregarTenantMirrorDb();
  if (!mirror) return base;

  const b = mirror.branding;
  return {
    ...base,
    slug: mirror.slug || base.slug,
    displayName: b.displayName ?? mirror.nomeExibicao ?? base.displayName,
    tagline: b.tagline ?? base.tagline,
    portalTitle: b.portalTitle ?? base.portalTitle,
    logoUrl: b.logoUrl ?? base.logoUrl,
    logoUrlHome: b.logoUrlHome ?? base.logoUrlHome,
    logoAlt: b.logoAlt ?? base.logoAlt,
    pwaShortName: b.pwaShortName ?? base.pwaShortName,
    themeColor: b.themeColor ?? base.themeColor,
    metaDescription: b.metaDescription ?? base.metaDescription,
  };
}

export async function getTermosTenantServer(): Promise<Record<TenantTermoId, string>> {
  const base = getTermosTenant();
  if (!useTenantDbMirror()) return base;

  const mirror = await carregarTenantMirrorDb();
  if (!mirror?.termos) return base;

  return {
    reconhecimento: mirror.termos.reconhecimento ?? base.reconhecimento,
    cafe_conecta: mirror.termos.cafe_conecta ?? base.cafe_conecta,
    quinta_treino: mirror.termos.quinta_treino ?? base.quinta_treino,
  };
}

export async function listarSetoresCadastroServer(): Promise<string[]> {
  if (!useTenantDbMirror()) return [...SETORES_PREDEFINIDOS];

  const mirror = await carregarTenantMirrorDb();
  if (mirror?.setores?.length) return mirror.setores;
  return [...SETORES_PREDEFINIDOS];
}

const SLUG_UNIDADE_MATRIZ_LEGADO = 'matriz';

function unidadesCadastroFallback(): UnidadeCadastro[] {
  return UNIDADES_CADASTRO.map((u) => ({ slug: u.slug, label: u.label }));
}

/** Unidades operacionais no Supabase; fallback à constante legada se vazio ou erro. */
export async function listarUnidadesCadastroServer(): Promise<UnidadeCadastro[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('unidades').select('nome, slug').order('nome');

    if (error || !data?.length) return unidadesCadastroFallback();

    const mapped = data
      .filter((u) => u.slug && String(u.slug) !== SLUG_UNIDADE_MATRIZ_LEGADO)
      .map((u) => ({
        slug: String(u.slug),
        label: String(u.nome ?? u.slug),
      }));

    return mapped.length > 0 ? mapped : unidadesCadastroFallback();
  } catch {
    return unidadesCadastroFallback();
  }
}

export async function listarUnidadesRelatorioFiliaisServer(): Promise<UnidadeCadastro[]> {
  const todas = await listarUnidadesCadastroServer();
  return todas.filter((u) => u.slug !== 'administrativo');
}

export async function isUnidadeSlugCadastroValidoServer(slug: string): Promise<boolean> {
  const unidades = await listarUnidadesCadastroServer();
  return unidades.some((u) => u.slug === slug);
}

export async function getModulosTenantServer(): Promise<TenantModulos> {
  const base = getModulosTenant();
  if (!useTenantDbMirror()) return base;

  const mirror = await carregarTenantMirrorDb();
  if (!mirror?.modulos) return base;

  return { ...base, ...mirror.modulos };
}
