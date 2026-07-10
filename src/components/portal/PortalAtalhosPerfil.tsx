'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { montarAtalhosPerfil } from '@/lib/portal-atalhos-perfil';
import { usePortalPerfil } from '@/contexts/PortalPerfilContext';

export function PortalAtalhosPerfil() {
  const { role, podeVisitaRh, carregado, graosCongelado } = usePortalPerfil();
  const [aberto, setAberto] = useState(false);
  const graosVisivel = carregado && !graosCongelado;

  const atalhos = useMemo(
    () => (carregado ? montarAtalhosPerfil(role, podeVisitaRh, { graosVisivel }) : []),
    [carregado, role, podeVisitaRh, graosVisivel]
  );

  if (!carregado || atalhos.length === 0) return null;

  return (
    <section className="rounded-2xl border border-cafeteria-200 bg-white/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-cream-50 transition-colors"
      >
        <span className="text-base font-display font-semibold text-cafeteria-800">Mais atalhos</span>
        <svg
          className={`w-5 h-5 shrink-0 text-dourado-base transition-transform ${aberto ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {aberto && (
        <div className="px-5 pb-5 pt-0 border-t border-cream-200">
          <ul className="grid gap-3 sm:grid-cols-2 mt-4">
            {atalhos.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="block rounded-xl border border-cafeteria-200 bg-cream-50/50 p-4 hover:border-dourado-base transition-colors h-full"
                >
                  <p className="font-semibold text-cafeteria-900">{a.titulo}</p>
                  <p className="text-sm text-cafeteria-600 mt-1">{a.descricao}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
