'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { EmocionalAlertasGestao } from '@/components/emocional/EmocionalAlertasGestao';
import { adminPathPermitidoRh } from '@/lib/admin-access';
import { SUGESTOES_ATUALIZADO } from '@/lib/sugestoes-events';

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
  const [sugestoesPendentes, setSugestoesPendentes] = useState(0);
  const [pendenciasSemana, setPendenciasSemana] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  type NavItemAdmin = { href: string; label: string; gorjeta?: boolean };

  const navGrupos: { titulo: string; itens: NavItemAdmin[] }[] = [
    {
      titulo: 'Visão geral',
      itens: [{ href: '/admin/dashboard', label: 'Dashboard' }],
    },
    {
      titulo: 'Pessoas',
      itens: [
        { href: '/admin/colaboradores', label: 'Colaboradores' },
        { href: '/admin/lideres-por-setor', label: 'Liderança por setor' },
        { href: '/admin/escalas', label: 'Escalas' },
      ],
    },
    {
      titulo: 'Avaliações',
      itens: [
        { href: '/admin/avaliacoes-diarias', label: 'Avaliação de Equipe (semanal)' },
        { href: '/admin/pendencias-semana', label: 'Pendências da semana' },
        { href: '/admin/avaliacoes-lideranca', label: 'Feedback liderança' },
        { href: '/admin/avaliacao-entre-pares', label: 'Avaliação entre pares' },
      ],
    },
    {
      titulo: 'Comunicação',
      itens: [
        { href: '/admin/avisos', label: 'Avisos' },
        { href: '/admin/sugestoes', label: 'Sugestões' },
        { href: '/admin/manual-eventos', label: 'Eventos de manuais' },
      ],
    },
    {
      titulo: 'Gestão',
      itens: [
        { href: '/admin/gorjeta', label: 'Gorjeta', gorjeta: true },
        { href: '/portal/ajuda-inbox', label: 'Inbox ajuda' },
        { href: '/portal/equipe-chat', label: 'Chat equipe' },
      ],
    },
  ];

  const navCompleto: NavItemAdmin[] = navGrupos.flatMap((g) => g.itens);

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

  useEffect(() => {
    if (authorized !== true || !podeVerGorjeta) {
      setSugestoesPendentes(0);
      return;
    }
    let cancel = false;
    const carregar = () => {
      fetch(`/api/admin/sugestoes/pendentes?_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((d: { ok?: boolean; pendentes?: number }) => {
          if (cancel || d.ok !== true) return;
          setSugestoesPendentes(Math.max(0, Number(d.pendentes ?? 0)));
        })
        .catch(() => {});
    };
    carregar();
    const timer = window.setInterval(carregar, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    window.addEventListener('focus', carregar);
    window.addEventListener(SUGESTOES_ATUALIZADO, carregar);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', carregar);
      window.removeEventListener(SUGESTOES_ATUALIZADO, carregar);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authorized, podeVerGorjeta]);

  useEffect(() => {
    if (authorized !== true || !podeVerGorjeta) {
      setPendenciasSemana(0);
      return;
    }
    let cancel = false;
    const carregar = () => {
      fetch(`/api/admin/avaliacoes-pendentes?resumo=1&_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((d: { ok?: boolean; total?: number }) => {
          if (cancel || d.ok !== true) return;
          setPendenciasSemana(Math.max(0, Number(d.total ?? 0)));
        })
        .catch(() => {});
    };
    carregar();
    const timer = window.setInterval(carregar, 30000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    window.addEventListener('focus', carregar);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', carregar);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authorized, podeVerGorjeta]);

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
    if (!sidebarOpen) return;
    const mq = window.matchMedia('(max-width: 767px)');
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

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

  const navLink = (href: string, label: string, badge?: number) => {
    const active = pathname === href || pathname?.startsWith(href + '/');
    const showBadge = typeof badge === 'number' && badge > 0;
    return (
      <Link
        href={href}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm md:text-base ${
          active ? 'bg-dourado-base/30 text-cream-100' : 'hover:bg-white/10'
        }`}
      >
        <span>{label}</span>
        {showBadge && (
          <span
            className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-coffee-base text-xs font-bold flex items-center justify-center shrink-0"
            aria-label={`${badge} aguardando análise`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
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
          h-full max-h-[100dvh] md:max-h-none
          flex flex-col
          bg-coffee-base text-cream-100 shrink-0
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between p-4 pb-0 shrink-0">
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pt-4">
          <nav className="space-y-4">
            {acessoRh || menuNav.length <= 8
              ? menuNav.map((item) => (
                  <div key={item.href}>
                    {navLink(
                      item.href,
                      item.label,
                      item.href === '/admin/sugestoes'
                        ? sugestoesPendentes
                        : item.href === '/admin/pendencias-semana'
                          ? pendenciasSemana
                          : undefined
                    )}
                  </div>
                ))
              : navGrupos.map((grupo) => {
                  const itensVisiveis = grupo.itens.filter((item) =>
                    menuNav.some((m) => m.href === item.href)
                  );
                  if (itensVisiveis.length === 0) return null;
                  return (
                    <div key={grupo.titulo}>
                      <p className="px-3 pt-2 pb-1 text-sm md:text-base font-semibold text-cream-100 flex items-center gap-1.5">
                        <span className="text-dourado-base shrink-0 leading-none" aria-hidden="true">
                          •
                        </span>
                        <span>{grupo.titulo}</span>
                      </p>
                      <div className="space-y-0.5">
                        {itensVisiveis.map((item) => (
                          <div key={item.href}>
                            {navLink(
                              item.href,
                              item.label,
                              item.href === '/admin/sugestoes'
                                ? sugestoesPendentes
                                : item.href === '/admin/pendencias-semana'
                                  ? pendenciasSemana
                                  : undefined
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
          </nav>
          <div className="mt-8 space-y-2 border-t border-white/20 pt-6 pb-4">
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
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-4">
            <EmocionalAlertasGestao />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
