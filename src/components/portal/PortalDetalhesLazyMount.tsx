'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/** Só monta filhos quando o <details> ancestral estiver aberto (evita fetch com painel fechado). */
export function PortalDetalhesLazyMount({ children }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.closest('details');
    if (!el) {
      setAberto(true);
      return;
    }
    const sync = () => setAberto(el.open);
    sync();
    el.addEventListener('toggle', sync);
    return () => el.removeEventListener('toggle', sync);
  }, []);

  return <div ref={ref}>{aberto ? children : null}</div>;
}
