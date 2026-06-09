const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheId: 'portal-gabi-fontes-v3-audit',
  /** Junta estas regras às predefinições do plugin (ordem: primeiro /api/admin = rede direta). */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    // Evita o SW servir HTML antigo (ex.: 404 em cache) em admin/API após novo deploy
    navigateFallbackDenylist: [/^\/admin/, /^\/api\//, /^\/portal/],
    runtimeCaching: [
      /** Páginas do portal (lista de manuais, etc.): sempre rede — evita SW mostrar bundle antigo sem manuais novos */
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/portal'),
        handler: 'NetworkOnly',
      },
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/api/admin'),
        handler: 'NetworkOnly',
      },
      /** APIs do portal (perfil, relatórios): nunca cache — evita mobile PWA com dados anonimizados antigos */
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/api/portal'),
        handler: 'NetworkOnly',
      },
      /** HTML dos manuais no iframe: evita SW servir resposta errada/vazia em produção */
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/onboarding/'),
        handler: 'NetworkOnly',
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/manuais/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin/bonificacao',
        destination: '/admin/gorjeta',
        permanent: true,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
