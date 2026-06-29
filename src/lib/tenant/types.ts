import type { DEFAULT_MODULOS } from '@/lib/tenant/defaults';

export type TenantModulos = { [K in keyof typeof DEFAULT_MODULOS]: boolean };

export type TenantBrandingDb = Partial<{
  displayName: string;
  tagline: string;
  portalTitle: string;
  logoUrl: string;
  logoUrlHome: string;
  logoAlt: string;
  pwaShortName: string;
  themeColor: string;
  metaDescription: string;
}>;

export type TenantMirrorDb = {
  tenantId: string;
  slug: string;
  nomeExibicao: string;
  branding: TenantBrandingDb;
  termos: Partial<Record<string, string>>;
  modulos: Partial<TenantModulos>;
  setores: string[];
};
