import Image from 'next/image';
import Link from 'next/link';
import { getTenantBranding } from '@/lib/tenant/branding';

export default function HomePage() {
  const branding = getTenantBranding();

  return (
    <div className="min-h-screen bg-portal-bg font-portal text-portal-ink antialiased">
      <header className="border-b border-black/[0.06] bg-portal-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-8 sm:py-10">
          <div className="relative h-16 w-auto sm:h-20">
            <Image
              src={branding.logoUrlHome}
              alt={branding.logoAlt}
              width={320}
              height={120}
              className="h-full w-auto object-contain"
              priority
            />
          </div>
          <p className="mt-4 max-w-xl text-center font-display text-xl text-portal-ink sm:text-2xl">
            {branding.portalTitle}
          </p>
          <p className="mt-2 max-w-md text-center text-sm font-medium leading-relaxed text-portal-inkMuted sm:text-base">
            Entre com seu celular (DDD) ou e-mail para acessar o vídeo de boas-vindas, manuais e demais conteúdos do portal.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <section className="flex flex-col items-center gap-6 text-center">
          <Link
            href="/login"
            className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-xl bg-portal-ink px-8 py-3 text-sm font-semibold text-portal-bg shadow-md transition hover:bg-portal-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink"
          >
            Entrar com celular ou e-mail
          </Link>
        </section>
      </main>
    </div>
  );
}
