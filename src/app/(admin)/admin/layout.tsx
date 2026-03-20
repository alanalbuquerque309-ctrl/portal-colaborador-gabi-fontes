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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const navLink = (href: string, label: string) => {
    const active = pathname === href || pathname?.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`block px-3 py-2 rounded-lg ${
          active ? 'bg-dourado-base/30 text-cream-100' : 'hover:bg-white/10'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-cream-100 flex">
      {/* Overlay para fechar sidebar no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-64 md:w-56
          bg-coffee-base text-cream-100 p-4 shrink-0
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-lg">Admin</h2>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 -mr-2 text-cream-200 hover:text-white"
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-1">
          {navLink('/admin/dashboard', 'Dashboard')}
          {navLink('/admin/colaboradores', 'Colaboradores')}
          {navLink('/admin/avisos', 'Avisos')}
          {navLink('/admin/destaque', 'Destaque')}
          {navLink('/admin/escalas', 'Escalas')}
          {navLink('/admin/sugestoes', 'Sugestões')}
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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-cream-100 border-b border-cream-300 px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-coffee-base hover:bg-white/50 rounded-lg"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
