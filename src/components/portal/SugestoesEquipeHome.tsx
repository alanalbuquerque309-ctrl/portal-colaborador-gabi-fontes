'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalBalaoCard } from '@/components/portal/vivo/PortalBalaoCard';
import { IlustracaoMegafone } from '@/components/portal/vivo/PortalIlustracao';
import { emitSugestoesAtualizado } from '@/lib/sugestoes-events';

type FeedItem = {
  id: string;
  texto: string;
  created_at: string;
  curtidas: number;
  autor: string;
  curtiu: boolean;
};

/** Balão na home: ideias da unidade + curtir (+ link para enviar). */
export function SugestoesEquipeHome() {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [curtindo, setCurtindo] = useState<string | null>(null);

  const carregar = useCallback(() => {
    fetch('/api/portal/sugestoes', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; feed?: FeedItem[] }) => {
        if (d.ok && Array.isArray(d.feed)) {
          setFeed(d.feed.slice(0, 3));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const curtir = async (id: string) => {
    setCurtindo(id);
    try {
      const res = await fetch(`/api/portal/sugestoes/${id}/curtir`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setFeed((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, curtiu: data.curtiu === true, curtidas: data.curtidas ?? f.curtidas }
              : f
          )
        );
        emitSugestoesAtualizado();
      }
    } finally {
      setCurtindo(null);
    }
  };

  return (
    <PortalBalaoCard tom="verde" ramoCanto="direita" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-semibold text-cafeteria-900">Sugestões da Equipe</h2>
          <p className="text-sm text-cafeteria-600 mt-0.5 leading-relaxed">
            Ideias dos colegas da sua unidade. Envio dá 1 Grão; bônus de 0 a 9 depende da análise da gestão.
          </p>
        </div>
        <IlustracaoMegafone className="w-20 h-16 shrink-0 opacity-90" />
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <XicaraCarregando size="sm" label="Carregando…" />
        </div>
      ) : feed.length === 0 ? (
        <p className="text-sm text-cafeteria-600 mb-4 rounded-xl bg-white/70 border border-portal-action/15 px-4 py-3">
          Ainda não há sugestões publicadas na unidade. Seja o primeiro a compartilhar uma ideia.
        </p>
      ) : (
        <ul className="space-y-2.5 mb-4">
          {feed.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-portal-action/15 bg-white/80 px-3.5 py-3 text-sm"
            >
              <p className="text-cafeteria-800 leading-snug line-clamp-3 whitespace-pre-wrap">{f.texto}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-cafeteria-600">
                <span>— {f.autor}</span>
                <button
                  type="button"
                  onClick={() => curtir(f.id)}
                  disabled={curtindo === f.id}
                  className={`rounded-lg px-2.5 py-1 border min-h-[32px] ${
                    f.curtiu
                      ? 'border-dourado-base bg-dourado-50 text-dourado-800'
                      : 'border-cafeteria-200 hover:bg-cream-50'
                  } disabled:opacity-50`}
                >
                  {curtindo === f.id ? '…' : f.curtiu ? 'Curtiu' : 'Curtir'} · {f.curtidas}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/portal/sugestoes"
        className="inline-flex w-full sm:w-auto justify-center min-h-[44px] items-center rounded-xl bg-portal-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-actionMuted shadow-md"
      >
        Enviar sugestão
      </Link>
    </PortalBalaoCard>
  );
}
