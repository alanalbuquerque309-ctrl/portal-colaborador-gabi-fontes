'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogoCarregando } from '@/components/ui/LogoCarregando';

type Props = {
  children: ReactNode;
  /** Altura mínima do placeholder enquanto não monta. */
  minHeight?: string;
  /** Atraso mínimo após abrir a home (ms) — prioriza «O que fazer agora». */
  delayMs?: number;
};

/**
 * Monta filhos só depois de um curto atraso ou quando entram perto da viewport.
 * Reduz APIs pesadas competindo com o bloco principal da home.
 */
export function PortalHomeSecaoAdiada({ children, minHeight = '6rem', delayMs = 350 }: Props) {
  const [montar, setMontar] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (montar) return;
    const timer = window.setTimeout(() => setMontar(true), delayMs);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return () => window.clearTimeout(timer);
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setMontar(true);
      },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => {
      window.clearTimeout(timer);
      obs.disconnect();
    };
  }, [montar, delayMs]);

  if (!montar) {
    return (
      <div
        ref={ref}
        style={{ minHeight }}
        className="flex items-center justify-center rounded-2xl border border-cafeteria-100/80 bg-cream-50/60 py-8"
        aria-hidden
      >
        <LogoCarregando size="sm" revelarCor />
      </div>
    );
  }

  return <div ref={ref}>{children}</div>;
}
