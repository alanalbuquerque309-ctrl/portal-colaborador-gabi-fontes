'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LiderInspiradorVencedor } from '@/lib/portal-home-types';

type Props = {
  /** Dentro da secção Reconhecimentos — visual mais compacto, sem link para o mural. */
  embedded?: boolean;
};

export function LiderInspiradorBanner({ embedded = false }: Props) {
  const [vencedor, setVencedor] = useState<LiderInspiradorVencedor | null>(null);
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/lider-inspirador', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; vencedor?: LiderInspiradorVencedor | null; semana_rotulo?: string }) => {
        if (cancel) return;
        if (d.ok && d.vencedor) {
          setVencedor(d.vencedor);
          setSemanaRotulo(d.semana_rotulo ?? d.vencedor.semana_rotulo ?? '');
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (loading || !vencedor) return null;

  const iniciais = vencedor.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <section
      aria-labelledby="lider-inspirador-titulo"
      className={
        embedded
          ? 'rounded-xl border border-emerald-200/80 bg-white/95 p-4 sm:p-5 mb-4 shadow-sm'
          : 'rounded-2xl border-2 border-emerald-300/70 bg-gradient-to-br from-emerald-50 via-white to-dourado-50/40 p-5 sm:p-6 shadow-md'
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {vencedor.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vencedor.foto_url}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-300 shadow-sm"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-lg font-semibold text-emerald-900"
              aria-hidden
            >
              {iniciais || '⭐'}
            </div>
          )}
          <span className="text-3xl sm:hidden" aria-hidden>
            ⭐
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p id="lider-inspirador-titulo" className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Líder Inspirador · semana {semanaRotulo || vencedor.semana_rotulo}
          </p>
          <h2 className="text-xl font-display font-semibold text-cafeteria-900 mt-1">{vencedor.nome}</h2>
          <p className="text-sm text-cafeteria-600 mt-0.5">
            {vencedor.unidade_nome}
            {vencedor.setor ? ` · ${vencedor.setor}` : ''}
          </p>

          {vencedor.motivos.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-cafeteria-800">
              {vencedor.motivos.map((m) => (
                <li key={m} className="flex gap-2">
                  <span className="text-emerald-600 shrink-0" aria-hidden>
                    •
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-xs italic text-cafeteria-600 leading-relaxed">
            Liderança é formar pessoas melhores que nós. Quando a equipe cresce, todos crescem.
          </p>

          {!embedded ? (
            <Link
              href="/portal/mural"
              className="inline-block mt-3 text-sm font-medium text-emerald-800 hover:underline"
            >
              Ver mural →
            </Link>
          ) : null}
        </div>

        <span className="hidden sm:block text-4xl shrink-0 opacity-90" aria-hidden>
          ⭐
        </span>
      </div>
    </section>
  );
}
