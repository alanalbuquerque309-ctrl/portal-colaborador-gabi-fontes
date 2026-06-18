'use client';

import { useEffect, useState } from 'react';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';

type QuintaApi = {
  ok?: boolean;
  eh_quinta?: boolean;
  perfil_treino?: 'lider' | 'colaborador';
  quinta_treino?: {
    titulo: string;
    resumo: string;
    embed_url: string | null;
    formato?: 'horizontal' | 'shorts';
  };
};

/** Treino da quinta exclusivo para liderança (Avaliação da equipe). */
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

  if (!data?.ok || !data.eh_quinta || data.perfil_treino !== 'lider') return null;

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
        formato={treino.formato}
      />
    </div>
  );
}
