const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheId: 'portal-gabi-fontes-v4-relatorio-post',
  extendDefaultRuntimeCaching: false,
  workboxOptions: {
    navigateFallbackDenylist: [/^\/admin/, /^\/api\//, /^\/portal/],
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/portal'),
        handler: 'NetworkOnly',
      },
      {
        urlPattern: ({ request, url }) =>
          request.method === 'GET' && url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
      },
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
