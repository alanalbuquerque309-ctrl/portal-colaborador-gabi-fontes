'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MANUAL_GERAL_COLABORADOR,
  hrefManual,
  hrefManualNoPortal,
  manualPorSetor,
} from '@/lib/manual-por-setor';

type PerfilMin = {
  setor: string | null;
  role: string | null;
  cargo: string | null;
};

/** Botão grande na home: abre manual operacional + manual do setor. */
export function ManuaisHomeButton() {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilMin | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/perfil', { credentials: 'include' })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          colaborador?: { setor?: string | null; role?: string | null; cargo?: string | null };
        }) => {
          if (cancel) return;
          if (data.ok && data.colaborador) {
            setPerfil({
              setor: data.colaborador.setor ?? null,
              role: data.colaborador.role ?? null,
              cargo: data.colaborador.cargo ?? null,
            });
          }
        }
      )
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  const manualSetor = perfil ? manualPorSetor(perfil.setor, perfil.role, perfil.cargo) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full rounded-2xl border-2 border-oceano-300 bg-gradient-to-br from-oceano-600 to-oceano-800 px-6 py-5 text-center shadow-md hover:from-oceano-700 hover:to-oceano-900 transition-colors min-h-[56px]"
      >
        <span className="block text-lg sm:text-xl font-display font-bold tracking-wide text-cream-50">
          MANUAIS GABI FONTES
        </span>
        <span className="block text-sm text-oceano-100/90 mt-1">Manual operacional e do seu setor</span>
      </button>

      {aberto ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-cafeteria-900/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manuais-home-titulo"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar"
            onClick={() => setAberto(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-oceano-200 bg-white shadow-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 id="manuais-home-titulo" className="text-lg font-display font-semibold text-cafeteria-900">
                Seus manuais
              </h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-cafeteria-500 hover:text-cafeteria-800 text-sm font-medium min-h-[36px] px-2"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-3">
              <a
                href={hrefManual(MANUAL_GERAL_COLABORADOR.file)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-dourado-base px-4 py-3 text-sm font-semibold text-cream-100 hover:bg-dourado-400"
              >
                {MANUAL_GERAL_COLABORADOR.titulo}
              </a>
              {manualSetor ? (
                <a
                  href={hrefManual(manualSetor.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-h-[48px] items-center justify-center rounded-xl border-2 border-oceano-300 bg-oceano-50 px-4 py-3 text-sm font-semibold text-oceano-800 hover:bg-oceano-100"
                >
                  {manualSetor.titulo}
                </a>
              ) : (
                <p className="text-sm text-cafeteria-600 rounded-xl border border-cafeteria-100 bg-cream-50 px-4 py-3">
                  Manual do setor será exibido quando o perfil estiver completo.
                </p>
              )}
              <Link
                href={hrefManualNoPortal(MANUAL_GERAL_COLABORADOR.file, MANUAL_GERAL_COLABORADOR.titulo)}
                className="block text-center text-sm font-medium text-oceano-700 hover:underline"
                onClick={() => setAberto(false)}
              >
                Ver no portal
              </Link>
              <Link
                href="/portal/manuais"
                className="block text-center text-xs text-cafeteria-500 hover:underline"
                onClick={() => setAberto(false)}
              >
                Biblioteca completa de manuais →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
