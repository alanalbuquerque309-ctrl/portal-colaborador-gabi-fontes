'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

const MIN_VISIBLE_MS = 380;

function hrefInternoPortal(href: string | null, pathname: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (href.startsWith('http') && typeof window !== 'undefined' && !href.startsWith(window.location.origin)) {
    return false;
  }
  const path = href.startsWith('http')
    ? new URL(href).pathname
    : href.split('?')[0]?.split('#')[0] ?? '';
  if (!path.startsWith('/portal') && !path.startsWith('/admin')) return false;
  return path !== pathname;
}

/**
 * Overlay com xícara durante navegação client-side (loading.tsx não cobre páginas 'use client').
 */
export function PortalNavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const shownAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = () => {
    shownAt.current = Date.now();
    setVisible(true);
  };

  const agendarOcultar = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const elapsed = Date.now() - shownAt.current;
    const wait = Math.max(MIN_VISIBLE_MS - elapsed, 100);
    hideTimer.current = setTimeout(() => setVisible(false), wait);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement | null;
      const link = alvo?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.getAttribute('target') === '_blank') return;
      const href = link.getAttribute('href');
      if (!hrefInternoPortal(href, pathname)) return;
      mostrar();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    mostrar();
    agendarOcultar();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-cream-100/80 backdrop-blur-[2px]"
      aria-busy="true"
      aria-live="polite"
    >
      <XicaraCarregando size="lg" label="Carregando…" />
    </div>
  );
}
