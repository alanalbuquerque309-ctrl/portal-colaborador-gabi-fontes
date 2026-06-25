'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QuintaTreinosPanel } from '@/components/portal/QuintaTreinosPanel';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';
import type { QuintaTreinoConfig } from '@/lib/graos/quinta-treino';
import { emitPortalHomeAtualizado } from '@/lib/portal-home-events';

type QuintaApi = {
  ok?: boolean;
  eh_quinta?: boolean;
  ver_todos?: boolean;
  perfil_treino?: 'lider' | 'colaborador';
  treino_lider_concluido?: boolean;
  treinos_quinta?: {
    colaborador: QuintaTreinoConfig;
    lider: QuintaTreinoConfig;
  };
  quinta_treino?: QuintaTreinoConfig & { embed_url: string | null };
};

/** Treino da quinta para liderança (e visão completa admin/sócio). */
export function QuintaTreinoLiderBanner() {
  const [data, setData] = useState<QuintaApi | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/portal/quinta-treino', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((json: QuintaApi) => {
        if (!cancel) {
          setData(json);
          setConcluido(json.treino_lider_concluido === true);
        }
      })
      .catch(() => {
        if (!cancel) setData({ ok: false });
      });
    return () => {
      cancel = true;
    };
  }, []);

  const marcarConcluido = async () => {
    setConcluindo(true);
    try {
      const res = await fetch('/api/portal/treinamento-lider/concluir', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.ok) {
        setConcluido(true);
        emitPortalHomeAtualizado();
      }
    } finally {
      setConcluindo(false);
    }
  };

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
      {concluido ? (
        <p className="text-sm text-emerald-700 font-medium">Treinamento concluído ✓</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={concluindo}
            onClick={() => void marcarConcluido()}
            className="rounded-lg border border-dourado-base bg-dourado-50 px-4 py-2 text-sm font-semibold text-coffee-base disabled:opacity-50 min-h-[44px]"
          >
            {concluindo ? 'Salvando…' : 'Assisti e entendi'}
          </button>
          <Link href="/portal/treinamento" className="text-sm text-dourado-base underline">
            Abrir em Treinamento
          </Link>
        </div>
      )}
    </div>
  );
}
