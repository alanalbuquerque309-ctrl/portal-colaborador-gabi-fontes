'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ElogioFeedItem, type ElogioFeedItemData } from '@/components/portal/ElogioFeedItem';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { IlustracaoMegafone } from '@/components/portal/vivo/PortalIlustracao';
import { PortalDetalhesLazyMount } from '@/components/portal/PortalDetalhesLazyMount';

function rotuloContagemElogios(total: number, novos: number): string {
  if (total === 0) return 'Nenhum elogio na semana';
  if (novos === 0) return `${total} ${total === 1 ? 'elogio' : 'elogios'} · todos vistos`;
  if (novos === total) {
    return total === 1 ? '1 elogio novo' : `${total} elogios novos`;
  }
  return `${total} elogios · ${novos} ${novos === 1 ? 'novo' : 'novos'}`;
}

function ElogiosEquipeHomeConteudo({
  loading,
  feed,
  onMarcadoLido,
}: {
  loading: boolean;
  feed: ElogioFeedItemData[];
  onMarcadoLido: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando elogios…" />
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <p className="text-sm text-cafeteria-600 rounded-xl bg-white/70 border border-portal-action/15 px-4 py-3">
        Nenhum elogio publicado neste período. Quando surgir um, aparece aqui para toda a rede.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5 list-none m-0 p-0">
      {feed.map((f) => (
        <ElogioFeedItem key={f.id} item={f} compacto onMarcadoLido={onMarcadoLido} />
      ))}
    </ul>
  );
}

/** Gaveta na home: elogios da rede ainda não lidos pelo colaborador (prazo de 2 semanas). */
export function SugestoesEquipeHome() {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<ElogioFeedItemData[]>([]);

  const carregar = useCallback(() => {
    setLoading(true);
    fetch('/api/portal/sugestoes?elogios_vigentes=1', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; feed?: ElogioFeedItemData[] }) => {
        if (d.ok && Array.isArray(d.feed)) {
          setFeed(d.feed);
        } else {
          setFeed([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const removerDoFeed = (id: string) => {
    setFeed((prev) =>
      prev.map((f) => (f.id === id ? { ...f, lido_por_mim: true } : f))
    );
  };

  const novos = feed.filter((f) => f.lido_por_mim !== true).length;
  const contagem = loading ? null : rotuloContagemElogios(feed.length, novos);

  return (
    <section className="rounded-2xl border border-portal-action/20 bg-gradient-to-br from-portal-actionLight/40 via-white to-cream-50 overflow-hidden shadow-sm">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-portal-actionLight/40 transition-colors [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-portal-actionLight text-portal-action text-xl"
            >
              💚
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-display font-semibold text-cafeteria-900">Elogios da equipe</h2>
                {contagem && (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      novos > 0
                        ? 'bg-portal-action text-white'
                        : feed.length > 0
                          ? 'bg-cafeteria-200 text-cafeteria-700'
                          : 'bg-cafeteria-100 text-cafeteria-600'
                    }`}
                  >
                    {contagem}
                  </span>
                )}
              </div>
              <p className="text-sm text-cafeteria-600 mt-0.5 leading-relaxed">
                Toque para ver os elogios disponíveis nesta semana (rede inteira).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <IlustracaoMegafone className="w-14 h-11 hidden sm:block opacity-80" />
            <svg
              className="w-5 h-5 text-portal-action transition-transform group-open:rotate-180"
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
          </div>
        </summary>

        <div className="px-4 sm:px-5 pb-5 border-t border-portal-action/15 pt-4 space-y-4">
          <PortalDetalhesLazyMount>
            <ElogiosEquipeHomeConteudo loading={loading} feed={feed} onMarcadoLido={removerDoFeed} />
          </PortalDetalhesLazyMount>

          <Link
            href="/portal/sugestoes"
            className="inline-flex w-full justify-center min-h-[44px] items-center rounded-xl bg-portal-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-actionMuted shadow-md"
          >
            Enviar elogio ou sugestão
          </Link>
        </div>
      </details>
    </section>
  );
}
