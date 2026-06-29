import type { Metadata } from 'next';
import { Montserrat, Playfair_Display, Source_Sans_3 } from 'next/font/google';
import { getTenantBranding } from '@/lib/tenant/branding';
import './globals.css';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001');

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  variable: '--font-source-sans',
  subsets: ['latin'],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export function generateMetadata(): Metadata {
  const b = getTenantBranding();
  return {
    metadataBase: new URL(siteUrl),
    title: `${b.portalTitle} | ${b.displayName}`,
    description: b.metaDescription,
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: b.pwaShortName,
    },
    formatDetection: { telephone: false, email: false },
    openGraph: {
      title: `${b.portalTitle} | ${b.displayName}`,
      description: b.metaDescription,
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${b.portalTitle} | ${b.displayName}`,
      description: b.metaDescription,
    },
  };
}

export const viewport = {
  themeColor: getTenantBranding().themeColor,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${sourceSans.variable} ${montserrat.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
