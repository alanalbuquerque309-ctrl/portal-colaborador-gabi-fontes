'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAuthorized(d.ok === true))
      .catch(() => setAuthorized(false));
  }, []);

  const isLoginPage = pathname === '/admin';

  useEffect(() => {
    if (authorized === false && !isLoginPage) {
      router.replace('/admin');
    }
  }, [authorized, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <XicaraCarregando size="lg" label="Carregando…" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream-100 flex">
      <aside className="w-56 bg-coffee-base text-cream-100 p-4 shrink-0">
        <h2 className="font-display font-semibold text-lg mb-6">Admin</h2>
        <nav className="space-y-1">
          <Link
            href="/admin/dashboard"
            className={`block px-3 py-2 rounded-lg ${
              pathname === '/admin/dashboard' ? 'bg-dourado-base/30 text-cream-100' : 'hover:bg-white/10'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/colaboradores"
            className={`block px-3 py-2 rounded-lg ${
              pathname?.startsWith('/admin/colaboradores') ? 'bg-dourado-base/30' : 'hover:bg-white/10'
            }`}
          >
            Colaboradores
          </Link>
          <Link
            href="/admin/avisos"
            className={`block px-3 py-2 rounded-lg ${
              pathname?.startsWith('/admin/avisos') ? 'bg-dourado-base/30' : 'hover:bg-white/10'
            }`}
          >
            Avisos
          </Link>
          <Link
            href="/admin/destaque"
            className={`block px-3 py-2 rounded-lg ${
              pathname?.startsWith('/admin/destaque') ? 'bg-dourado-base/30' : 'hover:bg-white/10'
            }`}
          >
            Destaque
          </Link>
          <Link
            href="/admin/escalas"
            className={`block px-3 py-2 rounded-lg ${
              pathname?.startsWith('/admin/escalas') ? 'bg-dourado-base/30' : 'hover:bg-white/10'
            }`}
          >
            Escalas
          </Link>
          <Link
            href="/admin/sugestoes"
            className={`block px-3 py-2 rounded-lg ${
              pathname?.startsWith('/admin/sugestoes') ? 'bg-dourado-base/30' : 'hover:bg-white/10'
            }`}
          >
            Sugestões
          </Link>
        </nav>
        <form action="/api/admin/logout" method="POST" className="mt-8">
          <button
            type="submit"
            className="text-sm text-cream-200 hover:text-white"
          >
            Sair do admin
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
