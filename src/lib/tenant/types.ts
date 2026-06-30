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

export type TenantEspelhoAdminPainel = {
  slug: string;
  use_tenant_db: boolean;
  espelho_061_disponivel: boolean;
  fonte_runtime: 'legado_env_defaults' | 'db_mirror';
  runtime: {
    branding: Record<string, string>;
    termos: Record<string, string>;
    modulos: TenantModulos;
    setores: string[];
    unidades: { slug: string; label: string }[];
  };
  legado_codigo: {
    branding: Record<string, string>;
    termos: Record<string, string>;
    modulos: TenantModulos;
    setores: string[];
    unidades: readonly { slug: string; label: string }[];
  };
  espelho_db: {
    tenant_id: string;
    slug: string;
    nome_exibicao: string;
    branding: Record<string, string | undefined>;
    termos: Record<string, string>;
    modulos: Partial<TenantModulos>;
    setores: string[];
  } | null;
  comparacao: {
    espelho_alinhado_legado_setores: boolean | null;
    espelho_alinhado_legado_modulos: boolean | null;
    runtime_diferente_legado: boolean;
  };
};

export type TenantMirrorDb = {
  tenantId: string;
  slug: string;
  nomeExibicao: string;
  branding: TenantBrandingDb;
  termos: Partial<Record<string, string>>;
  modulos: Partial<TenantModulos>;
  setores: string[];
};
