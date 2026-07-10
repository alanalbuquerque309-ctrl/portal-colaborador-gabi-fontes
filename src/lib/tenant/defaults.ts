/**
 * Defaults do tenant legado (Gabi Fontes).
 * Fonte da verdade em runtime até USE_TENANT_DB=true; usado como fallback em cascata.
 */

export const DEFAULT_TENANT_SLUG = 'gabi-fontes' as const;

export const DEFAULT_BRANDING = {
  displayName: 'Gabi Fontes',
  tagline: 'Cafeteria Gabi Fontes',
  portalTitle: 'Portal do Colaborador',
  logoUrl: '/logo-gabi-fontes.png',
  logoUrlHome: '/manuais/assets/logo-gabi-fontes-transparent.png',
  logoAlt: 'Gabi Fontes — Cafeteria & Doceria',
  pwaShortName: 'Portal GF',
  themeColor: '#FFFFFF',
  metaDescription: 'Cultura e Comunicação Interna - Gabi Fontes',
} as const;

export const DEFAULT_TERMOS = {
  reconhecimento: 'Grãos de café',
  cafe_conecta: 'Café Conecta',
  quinta_treino: 'Quinta do café',
} as const;

export const DEFAULT_MODULOS = {
  graos: true,
  cafe_conecta: true,
  quinta_treino: true,
  trofeus_pares: true,
  termometro_emocional: true,
  avaliacao_equipe: true,
  feedback_lideranca: true,
  escalas: true,
  /** Fechamento de gorjeta fora do portal — ADM/financeiro cuidam fora daqui. */
  gorjeta: false,
} as const;
