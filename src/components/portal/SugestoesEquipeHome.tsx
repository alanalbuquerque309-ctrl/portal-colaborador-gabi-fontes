'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalBalaoCard } from '@/components/portal/vivo/PortalBalaoCard';
import { IlustracaoMegafone } from '@/components/portal/vivo/PortalIlustracao';
import { LinhaAutorElogio } from '@/components/portal/LinhaAutorElogio';

type FeedElogio = {
  id: string;
  texto: string;
  created_at: string;
  autor: string;
  autor_setor?: string | null;
  autor_unidade?: string | null;
  anonimo?: boolean;
  tipo?: string;
};

/** Balão na home: elogios públicos da rede (semana civil vigente). */
export function SugestoesEquipeHome() {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedElogio[]>([]);

  const carregar = useCallback(() => {
    fetch('/api/portal/sugestoes', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; feed?: FeedElogio[] }) => {
        if (d.ok && Array.isArray(d.feed)) {
          setFeed(d.feed.slice(0, 3));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <PortalBalaoCard tom="verde" ramoCanto="direita" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-semibold text-cafeteria-900">Elogios da equipe</h2>
          <p className="text-sm text-cafeteria-600 mt-0.5 leading-relaxed">
            Reconhecimentos públicos de todas as unidades nesta semana. Sugestões e reclamações são tratadas pela gestão.
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
          Ainda não há elogios publicados nesta semana. Seja o primeiro a reconhecer um colega.
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
                <span>
                  <span className="text-emerald-800 font-medium">Elogio · </span>
                  <LinhaAutorElogio
                    anonimo={f.anonimo === true}
                    autor={f.autor}
                    autor_setor={f.autor_setor ?? null}
                    autor_unidade={f.autor_unidade ?? null}
                  />
                </span>
                <span>{new Date(f.created_at).toLocaleString('pt-BR')}</span>
              </div>
            </li>
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
