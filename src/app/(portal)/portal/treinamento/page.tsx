'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TreinamentoAcompanhamentoGestao } from '@/components/portal/TreinamentoAcompanhamentoGestao';
import { TreinamentoItemConteudo } from '@/components/portal/TreinamentoItemConteudo';
import { TreinamentoPublicoBadge } from '@/components/portal/TreinamentoPublicoBadge';
import { TreinamentoStatusChip } from '@/components/portal/TreinamentoStatusChip';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalPageHeader } from '@/components/portal/shell/PortalPageHeader';
import { PortalEmptyState } from '@/components/portal/shell/PortalEmptyState';
import { PortalActionCard } from '@/components/portal/shell/PortalActionCard';
import { emitPortalHomeAtualizado } from '@/lib/portal-home-events';
import { getTermo, getTermoCurto } from '@/lib/tenant/terminology';
import {
  agruparSemanaPorPublico,
  categorizarTreinamentos,
  ehConcluidoSemana,
  ehUuid,
  rotuloSemanaItem,
  type TreinamentoPortalItem,
} from '@/lib/treinamento-portal-ux';

export default function PortalTreinamentoPage() {
  const termoQuinta = getTermo('quinta_treino');
  const termoReconhecimento = getTermo('reconhecimento');
  const graosCurto = getTermoCurto('reconhecimento');
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<TreinamentoPortalItem[]>([]);
  const [links, setLinks] = useState<Record<string, string | null>>({});
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [historicoItemAberto, setHistoricoItemAberto] = useState<string | null>(null);
  const [extrasAberto, setExtrasAberto] = useState(false);

  const carregar = useCallback(() => {
    setErroCarregar(null);
    setLoading(true);
    fetch('/api/portal/treinamentos', { credentials: 'include' })
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

  const { semana, historico, extras } = useMemo(() => categorizarTreinamentos(itens), [itens]);
  const { equipe: semanaEquipe, lideranca: semanaLideranca, outros: semanaOutros } = useMemo(
    () => agruparSemanaPorPublico(semana),
    [semana]
  );
  const concluidosSemana = useMemo(() => semana.filter((t) => ehConcluidoSemana(t)).length, [semana]);
  const progressoPct = semana.length > 0 ? Math.round((concluidosSemana / semana.length) * 100) : 0;
  const semanaEmDia = semana.length > 0 && concluidosSemana === semana.length;

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
        setItens((prev) =>
          prev.map((t) => (t.id === id ? { ...t, confirmado: true, visualizado: true } : t))
        );
        emitPortalHomeAtualizado();
      }
    } finally {
      setConfirmando(null);
    }
  };

  const propsConteudo = {
    links,
    termoQuinta,
    termoReconhecimento,
    graosCurto,
    confirmando,
    onAbrir: abrirItem,
    onRecolher: () => setAbertoId(null),
    onConfirmar: confirmar,
    onRegistrarAutomatico: registrarTreinoAutomatico,
  };

  const renderListaSemana = (lista: TreinamentoPortalItem[]) =>
    lista.map((t) => {
      const itemAberto = abertoId === t.id;
      return (
        <div key={t.id}>
          <button
            type="button"
            onClick={() => abrirItem(t.id)}
            className="w-full flex items-center justify-between py-3 text-left hover:bg-cream-50/40 transition-colors min-h-[48px]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
              <TreinamentoStatusChip item={t} grande />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <TreinamentoPublicoBadge item={t} compacto />
                </div>
                <p className="text-sm font-semibold text-coffee-base">{t.titulo}</p>
                {t.descricao ? (
                  <p className="text-xs text-cafeteria-500 truncate mt-0.5">{t.descricao}</p>
                ) : null}
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-cafeteria-400 shrink-0 transition-transform duration-200 ${
                itemAberto ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {itemAberto ? (
            <div className="pb-4 space-y-3">
              <TreinamentoPublicoBadge item={t} />
              <TreinamentoItemConteudo
                item={t}
                aberto
                botaoPrimario={!ehConcluidoSemana(t)}
                {...propsConteudo}
              />
            </div>
          ) : null}
        </div>
      );
    });

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
        description="Material da semana em destaque. Confirme ao final quando solicitado."
        backHref="/portal"
        backLabel="Voltar ao portal"
        breadcrumb={[{ label: 'Portal', href: '/portal' }, { label: 'Treinamento' }]}
        icon="🎓"
        accent="oceano"
      />

      {erroCarregar ? (
        <div className="space-y-3">
          <PortalEmptyState message={erroCarregar} />
          <button
            type="button"
            onClick={() => carregar()}
            className="rounded-lg bg-dourado-base px-4 py-2.5 text-sm font-medium text-cream-100 hover:bg-dourado-400 transition-colors min-h-[44px]"
          >
            Tentar de novo
          </button>
        </div>
      ) : itens.length === 0 ? (
        <PortalEmptyState message="Nenhum treinamento disponível para você no momento." />
      ) : (
        <>
          {semana.length > 0 && (
            <section className="space-y-4">
              <div className="rounded-2xl border-2 border-dourado-base/40 bg-gradient-to-br from-dourado-50/60 via-white to-cream-50 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-dourado-base">
                      Treinamento desta semana
                    </p>
                    <p className="text-sm text-cafeteria-700 mt-0.5">
                      {concluidosSemana} de {semana.length} concluído{semana.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-lg font-bold tabular-nums text-dourado-base">{progressoPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-cream-200 overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      semanaEmDia ? 'bg-emerald-500' : 'bg-dourado-base'
                    }`}
                    style={{ width: `${progressoPct}%` }}
                    role="progressbar"
                    aria-valuenow={progressoPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                {semanaEmDia ? (
                  <p className="text-sm font-medium text-emerald-800 mb-4">
                    Tudo em dia nesta semana. Você concluiu o material vigente.
                  </p>
                ) : null}

                <div className="divide-y divide-cafeteria-100/60 border-t border-cafeteria-100/60">
                  {semanaEquipe.length > 0 ? (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-cafeteria-600 px-0.5 pb-2">
                        Para toda a equipe
                      </p>
                      {renderListaSemana(semanaEquipe)}
                    </div>
                  ) : null}
                  {semanaLideranca.length > 0 ? (
                    <div className={semanaEquipe.length > 0 ? 'pt-2 border-t border-cafeteria-100/80' : 'pt-2'}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-coffee-base px-0.5 pb-2">
                        Para liderança
                      </p>
                      <p className="text-[11px] text-cafeteria-600 px-0.5 pb-2 -mt-1">
                        Gerentes, RH, admin e sócios
                      </p>
                      {renderListaSemana(semanaLideranca)}
                    </div>
                  ) : null}
                  {semanaOutros.length > 0 ? renderListaSemana(semanaOutros) : null}
                </div>
              </div>
            </section>
          )}

          {historico.length > 0 && (
            <section className="rounded-2xl border border-cafeteria-200/60 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setHistoricoAberto((v) => !v);
                  if (historicoAberto) setHistoricoItemAberto(null);
                }}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-cream-50/50 transition-colors min-h-[48px]"
              >
                <div>
                  <span className="text-sm font-semibold text-coffee-base">
                    Treinamentos anteriores ({historico.length})
                  </span>
                  <p className="text-xs text-cafeteria-600 mt-0.5">
                    Semanas passadas. Status real: concluído, visualizado ou não concluiu.
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 text-cafeteria-400 transition-transform duration-200 shrink-0 ${
                    historicoAberto ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {historicoAberto && (
                <div className="border-t border-cafeteria-100">
                  {historico.map((t) => {
                    const itemAberto = historicoItemAberto === t.id;
                    return (
                      <div key={t.id} className="border-b border-cafeteria-100/60 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setHistoricoItemAberto(itemAberto ? null : t.id)}
                          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-cream-50/30 transition-colors min-h-[44px]"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <TreinamentoStatusChip item={t} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <TreinamentoPublicoBadge item={t} compacto />
                              </div>
                              <p className="text-sm font-medium text-coffee-base truncate">
                                {rotuloSemanaItem(t)}
                              </p>
                              <p className="text-xs text-cafeteria-500 truncate">{t.titulo}</p>
                            </div>
                          </div>
                          <svg
                            className={`h-3.5 w-3.5 text-cafeteria-300 shrink-0 ml-2 transition-transform duration-200 ${
                              itemAberto ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {itemAberto && (
                          <div className="px-5 pb-4">
                            <TreinamentoItemConteudo
                              item={t}
                              aberto
                              botaoPrimario={false}
                              {...propsConteudo}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {extras.length > 0 && (
            <section className="rounded-2xl border border-cafeteria-200/50 bg-cream-50/50 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setExtrasAberto((v) => !v);
                  if (extrasAberto) setAbertoId(null);
                }}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/60 transition-colors min-h-[48px]"
              >
                <div>
                  <span className="text-sm font-semibold text-coffee-base">
                    Outros materiais ({extras.length})
                  </span>
                  <p className="text-xs text-cafeteria-600 mt-0.5">Vídeos e conteúdos fora da semana vigente.</p>
                </div>
                <svg
                  className={`h-4 w-4 text-cafeteria-400 transition-transform duration-200 shrink-0 ${
                    extrasAberto ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {extrasAberto &&
                extras.map((t) => {
                const itemAberto = abertoId === t.id;
                return (
                  <div key={t.id} className="border-t border-cafeteria-100/60">
                    <button
                      type="button"
                      onClick={() => abrirItem(t.id)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/60 transition-colors min-h-[44px]"
                    >
                      <p className="text-sm font-medium text-coffee-base">{t.titulo}</p>
                      <svg
                        className={`h-3.5 w-3.5 text-cafeteria-300 shrink-0 ml-2 transition-transform duration-200 ${
                          itemAberto ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {itemAberto ? (
                      <div className="px-5 pb-4">
                        <TreinamentoItemConteudo
                          item={t}
                          aberto
                          botaoPrimario={false}
                          {...propsConteudo}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          )}
        </>
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
