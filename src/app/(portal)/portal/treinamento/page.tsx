'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TreinamentoAcompanhamentoGestao } from '@/components/portal/TreinamentoAcompanhamentoGestao';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { QuintaTreinoEmbed } from '@/components/portal/QuintaTreinoEmbed';
import { PortalPageHeader } from '@/components/portal/shell/PortalPageHeader';
import { PortalSection } from '@/components/portal/shell/PortalSection';
import { PortalEmptyState } from '@/components/portal/shell/PortalEmptyState';
import { PortalActionCard } from '@/components/portal/shell/PortalActionCard';
import { TreinamentoRichText } from '@/components/portal/TreinamentoRichText';
import { emitPortalHomeAtualizado } from '@/lib/portal-home-events';
import { getTermo, getTermoCurto } from '@/lib/tenant/terminology';

type TreinamentoItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_conteudo?: 'video' | 'texto';
  conteudo_texto?: string | null;
  exige_confirmacao: boolean;
  visualizado: boolean;
  confirmado: boolean;
  embed_url: string | null;
  created_at?: string | null;
};

function ehUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function ehConcluido(t: TreinamentoItem): boolean {
  return t.confirmado || (!t.exige_confirmacao && t.visualizado);
}

function rotuloSemana(t: TreinamentoItem): string {
  if (!t.created_at) return t.titulo;
  const d = new Date(t.created_at);
  if (isNaN(d.getTime())) return t.titulo;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `Semana de ${dia}/${mes}`;
}

function StatusChip({ item }: { item: TreinamentoItem }) {
  if (item.confirmado) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Concluído ✓
      </span>
    );
  }
  if (item.visualizado) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
        Visualizado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
      Pendente
    </span>
  );
}

export default function PortalTreinamentoPage() {
  const termoQuinta = getTermo('quinta_treino');
  const termoReconhecimento = getTermo('reconhecimento');
  const graosCurto = getTermoCurto('reconhecimento');
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<TreinamentoItem[]>([]);
  const [links, setLinks] = useState<Record<string, string | null>>({});
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [gavetaItemAberto, setGavetaItemAberto] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setErroCarregar(null);
    setLoading(true);
    fetch('/api/portal/perfil', { credentials: 'include', cache: 'no-store' })
      .then(() =>
        fetch('/api/portal/treinamentos', { credentials: 'include', cache: 'no-store' })
      )
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setItens(d.treinamentos ?? []);
          setLinks(d.links ?? {});
          setErroCarregar(null);
        } else {
          setItens([]);
          const msg = String(d.erro ?? 'Não foi possível carregar os treinamentos.');
          setErroCarregar(
            /login|sessão inválida/i.test(msg)
              ? `${msg} Saia e entre de novo pelo login do portal.`
              : msg
          );
        }
      })
      .catch(() => {
        setItens([]);
        setErroCarregar('Falha de conexão ao carregar treinamentos. Tente de novo.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pendentes = useMemo(() => itens.filter((t) => !ehConcluido(t)), [itens]);
  const concluidos = useMemo(() => itens.filter((t) => ehConcluido(t)), [itens]);
  const totalConcluidos = concluidos.length;
  const progressoPct = itens.length > 0 ? Math.round((totalConcluidos / itens.length) * 100) : 0;

  const registrarVisualizacao = async (id: string) => {
    if (!ehUuid(id)) return;
    await fetch(`/api/portal/treinamentos/${id}/visualizar`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    setItens((prev) => prev.map((t) => (t.id === id ? { ...t, visualizado: true } : t)));
  };

  const abrirItem = (id: string) => {
    setAbertoId((atual) => (atual === id ? null : id));
    void registrarVisualizacao(id);
  };

  const registrarTreinoAutomatico = useCallback((treinoId: string) => {
    void fetch('/api/portal/treinamentos/automatico/visualizar', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treino_id: treinoId }),
    }).catch(() => undefined);
  }, []);

  const confirmar = async (id: string) => {
    if (id === 'quinta-lider') {
      setConfirmando(id);
      try {
        const res = await fetch('/api/portal/treinamento-lider/concluir', {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) {
          setItens((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, confirmado: true, visualizado: true } : t
            )
          );
          emitPortalHomeAtualizado();
        }
      } finally {
        setConfirmando(null);
      }
      return;
    }
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
    <main className="space-y-6">
      <PortalPageHeader
        title="Treinamento"
        description="Vídeos e materiais da administração. Assista aqui no portal; quando pedido, confirme ao final."
        backHref="/portal"
        backLabel="Voltar ao portal"
        breadcrumb={[{ label: 'Portal', href: '/portal' }, { label: 'Treinamento' }]}
        icon="🎓"
        accent="oceano"
      />

      {itens.length > 0 && (
        <div className="rounded-2xl border border-cafeteria-200/90 bg-white shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-coffee-base">
              Progresso: {totalConcluidos} de {itens.length} concluído{itens.length === 1 ? '' : 's'}
            </p>
            <span className="text-sm font-semibold tabular-nums text-dourado-base">{progressoPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-dourado-base transition-all duration-300"
              style={{ width: `${progressoPct}%` }}
              role="progressbar"
              aria-valuenow={progressoPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {erroCarregar ? (
        <div className="space-y-3">
          <PortalEmptyState message={erroCarregar} />
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              carregar();
            }}
            className="rounded-lg bg-dourado-base px-4 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400 transition-colors min-h-[44px]"
          >
            Tentar de novo
          </button>
        </div>
      ) : itens.length === 0 ? (
        <PortalEmptyState message="Nenhum treinamento disponível para você no momento." />
      ) : (
        <div className="space-y-4">
          {/* ── Pendentes: exibidos normalmente ── */}
          {pendentes.map((t) => {
            const aberto = abertoId === t.id;
            const ehTexto = t.tipo_conteudo === 'texto';
            const linkInstitucional = t.id === 'video-institutional' ? links.video_boas_vindas : null;
            const linkQuinta =
              t.id.startsWith('quinta-') && links.graos_quinta ? links.graos_quinta : null;

            return (
              <PortalSection
                key={t.id}
                title={t.titulo}
                description={t.descricao ?? undefined}
                action={<StatusChip item={t} />}
                padding="sm"
              >
                {linkInstitucional ? (
                  <Link
                    href={linkInstitucional}
                    className="inline-flex rounded-lg bg-dourado-base px-4 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400 transition-colors min-h-[44px] items-center"
                  >
                    Abrir vídeo institucional
                  </Link>
                ) : t.id.startsWith('quinta-') && t.embed_url ? (
                  <div>
                    <QuintaTreinoEmbed
                      embedUrl={t.embed_url}
                      titulo={t.titulo}
                      resumo={t.descricao ?? ''}
                      onExibir={
                        t.id === 'quinta-colaborador'
                          ? () => registrarTreinoAutomatico('quinta-colaborador')
                          : undefined
                      }
                    />
                    {t.id === 'quinta-lider' && t.exige_confirmacao && !t.confirmado ? (
                      <button
                        type="button"
                        disabled={confirmando === t.id}
                        onClick={() => void confirmar(t.id)}
                        className="mt-3 rounded-lg border border-dourado-base bg-dourado-50 px-4 py-2.5 text-sm font-semibold text-coffee-base disabled:opacity-50 min-h-[44px]"
                      >
                        {confirmando === t.id ? 'Salvando…' : 'Assisti e entendi'}
                      </button>
                    ) : null}
                    {linkQuinta ? (
                      <Link href={linkQuinta} className="inline-block mt-2 text-xs text-dourado-base underline">
                        Abrir também em {termoReconhecimento}
                      </Link>
                    ) : null}
                  </div>
                ) : linkQuinta ? (
                  <Link
                    href={linkQuinta}
                    className="inline-flex rounded-lg bg-dourado-base px-4 py-2.5 text-sm font-medium text-cream-100 min-h-[44px] items-center"
                  >
                    Ir para {termoQuinta} ({graosCurto})
                  </Link>
                ) : (
                  <>
                    {!aberto ? (
                      <button
                        type="button"
                        onClick={() => abrirItem(t.id)}
                        className="rounded-lg bg-dourado-base px-4 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400 transition-colors min-h-[44px]"
                      >
                        {ehTexto ? 'Ler material' : 'Assistir vídeo'}
                      </button>
                    ) : (
                      <div>
                        {ehTexto && t.conteudo_texto ? (
                          <TreinamentoRichText conteudo={t.conteudo_texto} />
                        ) : t.embed_url ? (
                          <QuintaTreinoEmbed embedUrl={t.embed_url} titulo={t.titulo} resumo={t.descricao ?? ''} />
                        ) : null}
                        {t.exige_confirmacao && !t.confirmado ? (
                          <button
                            type="button"
                            disabled={confirmando === t.id}
                            onClick={() => void confirmar(t.id)}
                            className="mt-3 rounded-lg border border-dourado-base bg-dourado-50 px-4 py-2.5 text-sm font-semibold text-coffee-base disabled:opacity-50 min-h-[44px]"
                          >
                            {confirmando === t.id ? 'Salvando…' : 'Assisti e entendi'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAbertoId(null)}
                            className="mt-3 text-sm text-cafeteria-600 hover:text-coffee-base underline"
                          >
                            Recolher
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </PortalSection>
            );
          })}

          {pendentes.length === 0 && concluidos.length > 0 && (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5 text-center">
              <p className="text-sm font-medium text-emerald-800">Tudo em dia! Todos os treinamentos foram concluídos.</p>
            </div>
          )}

          {/* ── Concluídos: gaveta colapsável ── */}
          {concluidos.length > 0 && (
            <div className="rounded-2xl border border-cafeteria-200/60 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => { setGavetaAberta((v) => !v); if (gavetaAberta) setGavetaItemAberto(null); }}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-cream-50/50 transition-colors min-h-[48px]"
              >
                <span className="text-sm font-semibold text-cafeteria-700">
                  Treinamentos anteriores ({concluidos.length})
                </span>
                <svg
                  className={`h-4 w-4 text-cafeteria-400 transition-transform duration-200 ${gavetaAberta ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {gavetaAberta && (
                <div className="border-t border-cafeteria-100">
                  {concluidos.map((t) => {
                    const itemAberto = gavetaItemAberto === t.id;
                    const ehTexto = t.tipo_conteudo === 'texto';
                    const linkInstitucional = t.id === 'video-institutional' ? links.video_boas_vindas : null;

                    return (
                      <div key={t.id} className="border-b border-cafeteria-100/60 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setGavetaItemAberto(itemAberto ? null : t.id)}
                          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-cream-50/30 transition-colors min-h-[44px]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-emerald-500 shrink-0">✓</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-cafeteria-700 truncate">{rotuloSemana(t)}</p>
                              <p className="text-xs text-cafeteria-500 truncate">{t.titulo}</p>
                            </div>
                          </div>
                          <svg
                            className={`h-3.5 w-3.5 text-cafeteria-300 shrink-0 ml-2 transition-transform duration-200 ${itemAberto ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {itemAberto && (
                          <div className="px-5 pb-4">
                            {linkInstitucional ? (
                              <Link
                                href={linkInstitucional}
                                className="inline-flex rounded-lg bg-cafeteria-100 px-4 py-2 text-sm font-medium text-coffee-base hover:bg-cafeteria-200 transition-colors min-h-[40px] items-center"
                              >
                                Rever vídeo institucional
                              </Link>
                            ) : ehTexto && t.conteudo_texto ? (
                              <TreinamentoRichText conteudo={t.conteudo_texto} />
                            ) : t.embed_url ? (
                              <QuintaTreinoEmbed embedUrl={t.embed_url} titulo={t.titulo} resumo={t.descricao ?? ''} />
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <TreinamentoAcompanhamentoGestao />

      <PortalActionCard
        href={links.manuais ?? '/portal/manuais'}
        title="Biblioteca de manuais"
        description="PDFs e manuais por setor para consulta no dia a dia."
        cta="Abrir manuais →"
        tom="neutro"
        icon={
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        }
      />
    </main>
  );
}
