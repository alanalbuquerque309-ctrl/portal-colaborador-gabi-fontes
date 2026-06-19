'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';

type TreinamentoItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  exige_confirmacao: boolean;
  visualizado: boolean;
  confirmado: boolean;
  embed_url: string | null;
};

function ehUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export default function PortalTreinamentoPage() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<TreinamentoItem[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    fetch('/api/portal/treinamentos', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setItens(d.treinamentos ?? []);
          setLinks(d.links ?? {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const registrarVisualizacao = async (id: string) => {
    if (!ehUuid(id)) return;
    await fetch(`/api/portal/treinamentos/${id}/visualizar`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    setItens((prev) => prev.map((t) => (t.id === id ? { ...t, visualizado: true } : t)));
  };

  const abrirItem = (id: string) => {
    setAbertoId(id);
    void registrarVisualizacao(id);
  };

  const confirmar = async (id: string) => {
    if (!ehUuid(id)) return;
    setConfirmando(id);
    try {
      const res = await fetch(`/api/portal/treinamentos/${id}/confirmar`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setItens((prev) => prev.map((t) => (t.id === id ? { ...t, confirmado: true, visualizado: true } : t)));
      }
    } finally {
      setConfirmando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando treinamentos…" />
      </div>
    );
  }

  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <Link href="/portal" className="text-sm text-dourado-base hover:underline font-medium">
          ← Voltar ao portal
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-cafeteria-900 mt-2">Treinamento</h1>
        <p className="text-cafeteria-600 mt-1 text-sm">
          Vídeos e materiais da administração. Assista aqui no portal; quando pedido, confirme ao final.
        </p>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-cafeteria-600 rounded-xl border border-cafeteria-200 bg-white p-4">
          Nenhum treinamento disponível para você no momento.
        </p>
      ) : (
        <ul className="space-y-4">
          {itens.map((t) => {
            const aberto = abertoId === t.id;
            const linkInstitucional = t.id === 'video-institutional' ? links.video_boas_vindas : null;
            const linkQuinta = t.id.startsWith('quinta-') ? links.graos_quinta : null;

            return (
              <li key={t.id} className="rounded-xl border border-cafeteria-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-cafeteria-900">{t.titulo}</h2>
                    {t.descricao ? <p className="text-sm text-cafeteria-600 mt-1">{t.descricao}</p> : null}
                  </div>
                  <div className="text-xs text-cafeteria-500">
                    {t.confirmado ? '✓ Confirmado' : t.visualizado ? 'Visualizado' : 'Pendente'}
                  </div>
                </div>

                {linkInstitucional ? (
                  <Link
                    href={linkInstitucional}
                    className="inline-block mt-3 rounded-lg bg-dourado-base px-4 py-2 text-sm font-medium text-cream-100"
                  >
                    Abrir vídeo institucional
                  </Link>
                ) : t.id.startsWith('quinta-') && t.embed_url ? (
                  <div className="mt-4">
                    <QuintaTreinoEmbed embedUrl={t.embed_url} titulo={t.titulo} resumo={t.descricao ?? ''} />
                    {linkQuinta ? (
                      <Link href={linkQuinta} className="inline-block mt-2 text-xs text-dourado-base underline">
                        Abrir também em Grãos de café
                      </Link>
                    ) : null}
                  </div>
                ) : linkQuinta ? (
                  <Link
                    href={linkQuinta}
                    className="inline-block mt-3 rounded-lg bg-dourado-base px-4 py-2 text-sm font-medium text-cream-100"
                  >
                    Ir para Quinta do café (Grãos)
                  </Link>
                ) : (
                  <>
                    {!aberto ? (
                      <button
                        type="button"
                        onClick={() => abrirItem(t.id)}
                        className="mt-3 rounded-lg bg-dourado-base px-4 py-2 text-sm font-medium text-cream-100"
                      >
                        Assistir vídeo
                      </button>
                    ) : t.embed_url ? (
                      <div className="mt-4">
                        <QuintaTreinoEmbed embedUrl={t.embed_url} titulo={t.titulo} resumo={t.descricao ?? ''} />
                        {t.exige_confirmacao && !t.confirmado ? (
                          <button
                            type="button"
                            disabled={confirmando === t.id}
                            onClick={() => void confirmar(t.id)}
                            className="mt-3 rounded-lg border border-dourado-base bg-dourado-50 px-4 py-2 text-sm font-semibold text-cafeteria-900 disabled:opacity-50"
                          >
                            {confirmando === t.id ? 'Salvando…' : 'Assisti e entendi'}
                          </button>
                        ) : t.confirmado ? (
                          <p className="mt-3 text-sm text-emerald-700 font-medium">Concluído ✓</p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-cafeteria-500">
        Manuais em PDF/HTML:{' '}
        <Link href={links.manuais ?? '/portal/manuais'} className="text-dourado-base underline">
          Biblioteca de manuais
        </Link>
      </p>
    </main>
  );
}
