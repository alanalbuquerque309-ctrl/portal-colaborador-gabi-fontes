import type { Metadata } from 'next';
import { Montserrat, Playfair_Display, Source_Sans_3 } from 'next/font/google';
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Portal do Colaborador | Gabi Fontes',
  description: 'Cultura e Comunicação Interna - Gabi Fontes',
  manifest: '/manifest.json',
  icons: { apple: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Portal GF',
  },
  formatDetection: { telephone: false, email: false },
  openGraph: {
    title: 'Portal do Colaborador | Gabi Fontes',
    description: 'Cultura e Comunicação Interna - Cafeteria Gabi Fontes',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Portal do Colaborador | Gabi Fontes',
    description: 'Cultura e Comunicação Interna - Cafeteria Gabi Fontes',
  },
};

export const viewport = {
  themeColor: '#F9F7F2',
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
