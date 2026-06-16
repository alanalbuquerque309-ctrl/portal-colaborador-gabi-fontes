'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { rotuloDesdeVisita, type ResumoDesdeVisitaItem } from '@/lib/portal-resumo-desde-visita';
import { gravarUltimaVisitaHome, lerUltimaVisitaHome } from '@/lib/portal-ultima-visita';
import { getPortalSession } from '@/lib/utils/session';

export function DesdeUltimaVisitaHome() {
  const [fase, setFase] = useState<'loading' | 'pronto' | 'oculto'>('loading');
  const [titulo, setTitulo] = useState('Para você');
  const [itens, setItens] = useState<ResumoDesdeVisitaItem[]>([]);

  useEffect(() => {
    let cancelado = false;
    const sess = getPortalSession();
    if (!sess?.colaboradorId || sess.colaboradorId === 'pending') {
      setFase('oculto');
      return;
    }

    const ultima = lerUltimaVisitaHome();
    const params = new URLSearchParams();
    if (ultima) params.set('desde', ultima);

    void fetch(`/api/portal/resumo-desde-visita?${params.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelado || data?.ok !== true) {
          if (!cancelado) setFase('oculto');
          return;
        }
        const lista = Array.isArray(data.itens) ? (data.itens as ResumoDesdeVisitaItem[]) : [];
        if (lista.length === 0) {
          setFase('oculto');
          return;
        }
        setTitulo(rotuloDesdeVisita(data.desde_referencia ?? ultima, data.primeira_visita === true));
        setItens(lista);
        setFase('pronto');
        gravarUltimaVisitaHome();
      })
      .catch(() => {
        if (!cancelado) setFase('oculto');
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (fase === 'loading') {
    return (
      <section aria-busy="true" className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-display font-semibold text-cafeteria-900">Para você</h2>
        <p className="text-sm text-cafeteria-600 mt-2">Carregando seu resumo…</p>
      </section>
    );
  }

  if (fase === 'oculto' || itens.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="titulo-para-voce" className="rounded-2xl border border-cafeteria-200 bg-white p-5 shadow-sm">
      <h2 id="titulo-para-voce" className="text-lg font-display font-semibold text-cafeteria-900">
        Para você
      </h2>
      <p className="text-sm text-cafeteria-600 mt-1">{titulo}</p>
      <ul className="mt-4 space-y-2">
        {itens.map((item) => (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="flex gap-3 rounded-xl border border-cream-200 bg-cream-50/80 px-4 py-3 hover:border-dourado-base hover:bg-dourado-50/40 transition-colors"
              >
                <span className="text-xl shrink-0 leading-none pt-0.5" aria-hidden>
                  {item.emoji}
                </span>
                <span className="text-sm text-cafeteria-800 leading-relaxed">{item.texto}</span>
              </Link>
            ) : (
              <div className="flex gap-3 rounded-xl border border-cream-200 bg-cream-50/80 px-4 py-3">
                <span className="text-xl shrink-0 leading-none pt-0.5" aria-hidden>
                  {item.emoji}
                </span>
                <span className="text-sm text-cafeteria-800 leading-relaxed">{item.texto}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
