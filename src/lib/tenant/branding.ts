import { DEFAULT_BRANDING, DEFAULT_TENANT_SLUG } from '@/lib/tenant/defaults';

export type TenantBranding = {
  slug: string;
  displayName: string;
  tagline: string;
  portalTitle: string;
  logoUrl: string;
  logoUrlHome: string;
  logoAlt: string;
  pwaShortName: string;
  themeColor: string;
  metaDescription: string;
};

function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/** Branding síncrono (build + client): env NEXT_PUBLIC_* com fallback Gabi Fontes. */
export function getTenantBranding(): TenantBranding {
  const displayName = env('NEXT_PUBLIC_TENANT_DISPLAY_NAME') ?? DEFAULT_BRANDING.displayName;
  const portalTitle = env('NEXT_PUBLIC_TENANT_PORTAL_TITLE') ?? DEFAULT_BRANDING.portalTitle;

  return {
    slug: env('TENANT_SLUG') ?? env('NEXT_PUBLIC_TENANT_SLUG') ?? DEFAULT_TENANT_SLUG,
    displayName,
    tagline: env('NEXT_PUBLIC_TENANT_TAGLINE') ?? DEFAULT_BRANDING.tagline,
    portalTitle,
    logoUrl: env('NEXT_PUBLIC_TENANT_LOGO_URL') ?? DEFAULT_BRANDING.logoUrl,
    logoUrlHome: env('NEXT_PUBLIC_TENANT_LOGO_HOME_URL') ?? DEFAULT_BRANDING.logoUrlHome,
    logoAlt:
      env('NEXT_PUBLIC_TENANT_LOGO_ALT') ??
      `${displayName} — ${portalTitle}`,
    pwaShortName: env('NEXT_PUBLIC_TENANT_PWA_SHORT_NAME') ?? DEFAULT_BRANDING.pwaShortName,
    themeColor: env('NEXT_PUBLIC_TENANT_THEME_COLOR') ?? DEFAULT_BRANDING.themeColor,
    metaDescription:
      env('NEXT_PUBLIC_TENANT_META_DESCRIPTION') ??
      `${portalTitle} - ${displayName}`,
  };
}

export function tituloPaginaTenant(sufixo?: string): string {
  const b = getTenantBranding();
  if (!sufixo?.trim()) return `${b.portalTitle} | ${b.displayName}`;
  return `${sufixo.trim()} | ${b.portalTitle}`;
}
