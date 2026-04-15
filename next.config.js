const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  /** Junta estas regras às predefinições do plugin (ordem: primeiro /api/admin = rede direta). */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    // Evita o SW servir HTML antigo (ex.: 404 em cache) em admin/API após novo deploy
    navigateFallbackDenylist: [/^\/admin/, /^\/api\//],
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/api/admin'),
        handler: 'NetworkOnly',
      },
      /** HTML dos manuais no iframe: evita SW servir resposta errada/vazia em produção */
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/manuais/'),
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
};

module.exports = withPWA(nextConfig);
