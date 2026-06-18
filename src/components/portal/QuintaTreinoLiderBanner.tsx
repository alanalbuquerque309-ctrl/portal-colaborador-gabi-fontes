'use client';

import { useEffect, useState } from 'react';
import { QuintaTreinosPanel } from '@/components/portal/QuintaTreinosPanel';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';
import type { QuintaTreinoConfig } from '@/lib/graos/quinta-treino';

type QuintaApi = {
  ok?: boolean;
  eh_quinta?: boolean;
  ver_todos?: boolean;
  perfil_treino?: 'lider' | 'colaborador';
  treinos_quinta?: {
    colaborador: QuintaTreinoConfig;
    lider: QuintaTreinoConfig;
  };
  quinta_treino?: QuintaTreinoConfig & { embed_url: string | null };
};

/** Treino da quinta para liderança (e visão completa admin/sócio). */
export function QuintaTreinoLiderBanner() {
  const [data, setData] = useState<QuintaApi | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/quinta-treino', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((json: QuintaApi) => {
        if (!cancel) setData(json);
      })
      .catch(() => {
        if (!cancel) setData({ ok: false });
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (!data?.ok || !data.eh_quinta) return null;

  if (data.ver_todos && data.treinos_quinta) {
    return (
      <QuintaTreinosPanel
        ehQuinta
        treinoColaborador={data.treinos_quinta.colaborador}
        treinoLider={data.treinos_quinta.lider}
        intro="Visão gestão: treinos publicados para colaboradores e para liderança."
        className="mb-6"
      />
    );
  }

  if (data.perfil_treino !== 'lider') return null;

  const treino = data.quinta_treino;
  if (!treino?.embed_url) {
    return (
      <div className="rounded-xl border-2 border-dourado-400 bg-dourado-50/80 p-4 space-y-2 mb-6">
        <p className="font-semibold text-cafeteria-900">⭐ Quinta do café — liderança</p>
        <p className="text-sm text-cafeteria-700 leading-relaxed">
          {treino?.resumo ?? 'Treino da semana para liderança será publicado em breve.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dourado-400 bg-white p-4 space-y-3 mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-dourado-700">
        Quinta do café · só liderança
      </p>
      <QuintaTreinoEmbed
        embedUrl={treino.embed_url}
        titulo={treino.titulo}
        resumo={treino.resumo}
        apresentador={treino.apresentador}
        formato={treino.formato}
      />
    </div>
  );
}
