'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { adminPathPermitidoRh } from '@/lib/admin-access';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [acessoRh, setAcessoRh] = useState(false);
  const [nivelLabel, setNivelLabel] = useState('');
  const [menuNav, setMenuNav] = useState<{ href: string; label: string }[]>([]);
  const [podeVerGorjeta, setPodeVerGorjeta] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navCompleto: { href: string; label: string; gorjeta?: boolean }[] = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/colaboradores', label: 'Colaboradores' },
    { href: '/admin/lideres-por-setor', label: 'Liderança por setor' },
    { href: '/admin/avisos', label: 'Avisos' },
    { href: '/admin/destaque', label: 'Destaque' },
    { href: '/admin/escalas', label: 'Escalas' },
    { href: '/admin/avaliacoes-diarias', label: 'Avaliações equipe (semanal)' },
    { href: '/admin/avaliacoes-lideranca', label: 'Feedback liderança' },
    { href: '/admin/gorjeta', label: 'Gorjeta', gorjeta: true },
    { href: '/admin/sugestoes', label: 'Sugestões' },
    { href: '/admin/manual-eventos', label: 'Eventos de manuais' },
    { href: '/portal/ajuda-inbox', label: 'Inbox ajuda' },
    { href: '/portal/equipe-chat', label: 'Chat equipe' },
  ];

  useEffect(() => {
    const ac = new AbortController();
    const timeoutMs = 15000;
    const timer = window.setTimeout(() => ac.abort(), timeoutMs);
    const url = `/api/admin/auth?_=${Date.now()}`;
    fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      signal: ac.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (r) => {
        const d = (await r.json().catch(() => ({ ok: false }))) as {
          ok?: boolean;
          acesso_limitado_rh?: boolean;
          nivel_label?: string;
          menu_rh?: { href: string; label: string }[];
          podeVerGorjeta?: boolean;
          podeVerBonificacao?: boolean;
        };
        setAuthorized(d.ok === true);
        const rh = d.acesso_limitado_rh === true;
        setAcessoRh(rh);
        setNivelLabel(String(d.nivel_label ?? ''));
        if (rh && Array.isArray(d.menu_rh) && d.menu_rh.length > 0) {
          setMenuNav(d.menu_rh);
        } else {
          setMenuNav(navCompleto.filter((i) => !i.gorjeta || d.podeVerGorjeta || d.podeVerBonificacao));
        }
        setPodeVerGorjeta(d.podeVerGorjeta === true || d.podeVerBonificacao === true);
      })
      .catch(() => setAuthorized(false))
      .finally(() => window.clearTimeout(timer));
  }, []);

  const pathNorm = pathname?.replace(/\/$/, '') ?? '';
  const isLoginPage = pathNorm === '/admin';

  /** Sem sessão admin: ir ao portal se ainda estiver logado no portal; senão /login. */
  useEffect(() => {
    if (authorized !== false || isLoginPage) return;
    let cancelled = false;
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean }) => {
        if (cancelled) return;
        if (d?.ok) router.replace('/portal');
        else router.replace('/login');
      })
      .catch(() => {
        if (!cancelled) router.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [authorized, isLoginPage, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (authorized !== true || !acessoRh || isLoginPage) return;
    if (!adminPathPermitidoRh(pathname)) {
      router.replace('/admin/dashboard');
    }
  }, [authorized, acessoRh, pathname, isLoginPage, router]);

  useEffect(() => {
    if (pathname !== '/admin/dashboard') return;
    if (authorized !== true) return;

    const state = (window.history.state || {}) as Record<string, unknown>;
    if (state.adminGuard !== true) {
      window.history.pushState({ ...state, adminGuard: true }, '', window.location.href);
    }

    const onPopState = () => {
      try {
        sessionStorage.setItem('portal_skip_back_guard_once', '1');
      } catch {
        /* noop */
      }
      router.replace('/portal');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [authorized, pathname, router]);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <XicaraCarregando size="lg" label="Redirecionando…" />
      </div>
    );
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
          <div>
            <h2 className="font-display font-semibold text-lg">Admin</h2>
            {nivelLabel && (
              <p className="text-xs text-cream-200/90 mt-0.5">{nivelLabel}</p>
            )}
          </div>
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
          {menuNav.map((item) => navLink(item.href, item.label))}
        </nav>
        <div className="mt-8 space-y-2 border-t border-white/20 pt-6">
          <Link
            href="/portal"
            className="block text-sm font-medium text-cream-100 hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              try {
                sessionStorage.setItem('portal_skip_back_guard_once', '1');
              } catch {
                /* noop */
              }
              fetch('/api/admin/restaurar-portal', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              })
                .catch(() => null)
                .finally(() => {
                  router.push('/portal');
                });
            }}
          >
            Voltar ao portal
          </Link>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-cream-200/90 hover:text-white underline-offset-2 hover:underline">
              Encerrar sessão admin (senha)
            </button>
          </form>
        </div>
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
