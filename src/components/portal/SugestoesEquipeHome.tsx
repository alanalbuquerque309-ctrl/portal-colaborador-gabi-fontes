'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ElogioFeedItem, type ElogioFeedItemData } from '@/components/portal/ElogioFeedItem';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalBalaoCard } from '@/components/portal/vivo/PortalBalaoCard';
import { IlustracaoMegafone } from '@/components/portal/vivo/PortalIlustracao';

/** Balão na home: elogios da rede ainda não lidos pelo colaborador. */
export function SugestoesEquipeHome() {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<ElogioFeedItemData[]>([]);

  const carregar = useCallback(() => {
    setLoading(true);
    fetch('/api/portal/sugestoes', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; feed?: ElogioFeedItemData[] }) => {
        if (d.ok && Array.isArray(d.feed)) {
          setFeed(d.feed.slice(0, 2));
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
    setFeed((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <PortalBalaoCard tom="verde" ramoCanto="direita" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-semibold text-cafeteria-900">Elogios da equipe</h2>
          <p className="text-sm text-cafeteria-600 mt-0.5 leading-relaxed">
            Reconhecimentos de todas as unidades. Marque como lido quando vir; somem na segunda seguinte se ainda
            estiverem no ar.
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
          Nenhum elogio novo para você no momento. Quando surgir um, aparece aqui até marcar como lido.
        </p>
      ) : (
        <ul className="space-y-2.5 mb-4">
          {feed.map((f) => (
            <ElogioFeedItem key={f.id} item={f} compacto onMarcadoLido={removerDoFeed} />
          ))}
        </ul>
      )}

      <Link
        href="/portal/sugestoes"
        className="inline-flex w-full sm:w-auto justify-center min-h-[44px] items-center rounded-xl bg-portal-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-actionMuted shadow-md"
      >
        Enviar elogio ou sugestão
      </Link>
    </PortalBalaoCard>
  );
}
