'use client';

import { useEffect, useState } from 'react';
import { listarUnidadesCadastro, type UnidadeCadastro } from '@/lib/tenant/org-catalog';

/** Unidades para selects: constante imediata, depois lista do Supabase via `/api/tenant/org`. */
export function useUnidadesCadastro(): UnidadeCadastro[] {
  const [unidades, setUnidades] = useState<UnidadeCadastro[]>(() => [...listarUnidadesCadastro()]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tenant/org', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok || !Array.isArray(d.unidades) || d.unidades.length === 0) return;
        setUnidades(
          d.unidades.map((u: { slug: string; label?: string }) => ({
            slug: String(u.slug),
            label: String(u.label ?? u.slug),
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return unidades;
}
