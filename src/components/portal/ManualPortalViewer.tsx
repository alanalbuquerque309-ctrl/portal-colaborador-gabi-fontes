'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hrefManual, MANUAL_ASSET_VERSION } from '@/lib/manual-por-setor';

type Props = {
  titulo: string;
  arquivo: string;
  voltarHref?: string;
  voltarRotulo?: string;
};

export function ManualPortalViewer({
  titulo,
  arquivo,
  voltarHref = '/portal/manuais',
  voltarRotulo = 'Voltar aos manuais',
}: Props) {
  const [srcIframe, setSrcIframe] = useState('');

  useEffect(() => {
    const path = hrefManual(arquivo);
    setSrcIframe(typeof window !== 'undefined' ? `${window.location.origin}${path}` : path);
  }, [arquivo]);

  const hrefExterno = hrefManual(arquivo);

  return (
    <div className="space-y-3 -mt-2">
      <div className="sticky top-[3.25rem] z-40 -mx-4 px-4 py-2 bg-cream-100/95 backdrop-blur border-b border-cafeteria-200/80 md:top-[4.5rem]">
        <div className="flex flex-wrap items-center gap-2 max-w-3xl">
          <Link
            href={voltarHref}
            className="inline-flex min-h-[40px] items-center rounded-lg border border-cafeteria-200 bg-white px-3 text-sm font-medium text-cafeteria-800 hover:bg-cream-50"
          >
            ← {voltarRotulo}
          </Link>
          <Link
            href="/portal"
            className="inline-flex min-h-[40px] items-center rounded-lg border border-cafeteria-200 bg-white px-3 text-sm font-medium text-cafeteria-800 hover:bg-cream-50"
          >
            Início
          </Link>
          <Link
            href="/portal/manuais"
            className="inline-flex min-h-[40px] items-center rounded-lg border border-dourado-200 bg-dourado-50/60 px-3 text-sm font-medium text-cafeteria-800 hover:bg-dourado-50"
          >
            Manuais
          </Link>
          <a
            href={hrefExterno}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center rounded-lg px-3 text-sm font-medium text-dourado-base hover:underline ml-auto"
          >
            Nova aba
          </a>
        </div>
      </div>

      <div className="max-w-3xl space-y-3 pb-4">
        <h1 className="text-xl md:text-2xl font-display font-semibold text-cafeteria-900">{titulo}</h1>
        <p className="text-xs text-cafeteria-500">
          O menu do portal (ícones em baixo no celular) permanece visível enquanto você lê.
        </p>

        <div className="rounded-2xl border border-cafeteria-200 bg-white p-2 shadow-sm">
          {srcIframe ? (
            <iframe
              key={`${arquivo}-${MANUAL_ASSET_VERSION}`}
              title={titulo}
              src={srcIframe}
              className="w-full min-h-[min(58vh,520px)] max-h-[min(58vh,520px)] rounded-lg bg-white"
              sandbox="allow-same-origin allow-scripts allow-downloads"
            />
          ) : (
            <div className="min-h-[40vh] flex items-center justify-center text-sm text-cafeteria-600">
              Carregando manual…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
