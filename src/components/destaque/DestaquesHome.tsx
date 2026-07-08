'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PodioTop3 } from '@/components/portal/vivo/PodioTop3';
import { PodioTop3Trofeus } from '@/components/portal/vivo/PodioTop3Trofeus';
import {
  LinhaRankingTrofeu,
  proximoLoteRankingTrofeus,
  rotuloMes,
  ROTULO_PERIODO_RANKING_ANUAL,
  ROTULO_PERIODO_RANKING_MENSAL,
  ROTULO_PERIODO_RANKING_SEMANAL,
  SUBTITULO_RANKING_AVALIACAO_ANUAL,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE,
  SUBTITULO_RANKING_AVALIACAO_SEMANAL,
  SUBTITULO_RANKING_TROFEUS_ANUAL,
  SUBTITULO_RANKING_TROFEUS_MENSAL,
  SUBTITULO_RANKING_TROFEUS_SEMANAL,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
  type RankingTrofeuItem,
} from '@/components/mural/ranking-ui';
import {
  DESTAQUE_ABAS_UNIDADE,
  type DestaqueAbaUnidadeId,
  normalizarPorUnidade,
  normalizarTop3Geral,
  normalizarTrofeus,
  top3DestaquePorAba,
  trofeusDestaquePorAba,
} from '@/lib/destaques-home-unidades';

export type DestaquePeriodoAba = 'semanal' | 'mensal' | 'acumulado';

type Props = {
  aba: DestaquePeriodoAba;
};

/** Home: pódio avaliação + troféus; carrega só o período ativo. */
export function DestaquesHome({ aba }: Props) {
  const [loading, setLoading] = useState(true);
  const [abaUnidade, setAbaUnidade] = useState<DestaqueAbaUnidadeId>('geral');
  const [trofeusExpandido, setTrofeusExpandido] = useState(false);
  const [trofeusVisiveis, setTrofeusVisiveis] = useState(4);
  const [periodoRotulo, setPeriodoRotulo] = useState('');
  const [geral, setGeral] = useState<RankingAvaliacaoItem[]>([]);
  const [porUnidade, setPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [trofeus, setTrofeus] = useState<RankingTrofeuItem[]>([]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);

    const url =
      aba === 'semanal'
        ? '/api/portal/reconhecimento-semanal'
        : aba === 'mensal'
          ? '/api/portal/destaque'
          : '/api/portal/reconhecimento-anual';

    fetch(url, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancel || data?.ok !== true) return;
        if (aba === 'semanal') {
          setPeriodoRotulo(String(data.semana_rotulo ?? ''));
        } else if (aba === 'mensal') {
          const mes = String(data.mes_referencia ?? '');
          setPeriodoRotulo(mes ? rotuloMes(mes) : '');
        } else {
          setPeriodoRotulo(String(data.ano_referencia ?? new Date().getFullYear()));
        }
        setGeral(normalizarTop3Geral(data.ranking_geral_top3));
        setPorUnidade(normalizarPorUnidade(data.ranking_por_unidade));
        setTrofeus(normalizarTrofeus(data.ranking_trofeus));
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [aba]);

  useEffect(() => {
    setTrofeusExpandido(false);
    setTrofeusVisiveis(4);
  }, [aba, abaUnidade]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando destaques…" />
      </div>
    );
  }

  const top3 = top3DestaquePorAba(abaUnidade, geral, porUnidade);
  const trofeusLista = trofeusDestaquePorAba(abaUnidade, trofeus);
  const periodoLabel = periodoRotulo || (aba === 'semanal' ? 'esta semana' : aba === 'mensal' ? 'este mês' : 'este ano');

  const subtituloAvaliacao =
    aba === 'semanal'
      ? SUBTITULO_RANKING_AVALIACAO_SEMANAL
      : aba === 'mensal'
        ? SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE
        : SUBTITULO_RANKING_AVALIACAO_ANUAL;

  const subtituloTrofeus =
    aba === 'semanal'
      ? SUBTITULO_RANKING_TROFEUS_SEMANAL
      : aba === 'mensal'
        ? SUBTITULO_RANKING_TROFEUS_MENSAL
        : SUBTITULO_RANKING_TROFEUS_ANUAL;

  const labelUnidade = DESTAQUE_ABAS_UNIDADE.find((u) => u.id === abaUnidade)?.label ?? 'Geral';
  const etiquetaPeriodo =
    aba === 'semanal'
      ? ROTULO_PERIODO_RANKING_SEMANAL
      : aba === 'mensal'
        ? ROTULO_PERIODO_RANKING_MENSAL
        : ROTULO_PERIODO_RANKING_ANUAL;

  const podioModo = aba === 'semanal' ? 'semanal' : 'mensal';
  const trofeusPeriodo = aba === 'semanal' ? 'semanal' : 'mensal';

  const temAvaliacao = geral.length > 0 || porUnidade.length > 0;
  const temTrofeus = trofeus.length > 0;

  const top3Trofeus = trofeusLista.slice(0, 3);
  const restoTrofeus = trofeusLista.slice(3);
  const restoVisivel = restoTrofeus.slice(0, trofeusVisiveis);
  const restoRestantes = restoTrofeus.length - restoVisivel.length;
  const loteTrofeus = proximoLoteRankingTrofeus(trofeusVisiveis);
  const proximosTrofeus = Math.min(loteTrofeus, restoRestantes);

  if (!temAvaliacao && !temTrofeus) {
    return (
      <p className="text-sm text-cafeteria-700 rounded-xl border border-dourado-200 bg-cream-50 p-4">
        Os reconhecimentos aparecem quando a liderança registra avaliações ou a equipe envia troféus. Rankings
        completos no{' '}
        <Link href="/portal/mural" className="text-dourado-base font-medium hover:underline">
          mural
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Unidade do ranking">
        {DESTAQUE_ABAS_UNIDADE.map((u) => {
          const ativo = abaUnidade === u.id;
          const curto = 'labelCurto' in u ? u.labelCurto : u.label;
          return (
            <button
              key={u.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAbaUnidade(u.id)}
              className={`rounded-full px-3 py-2 text-sm font-medium min-h-[40px] border transition-colors ${
                ativo
                  ? 'bg-coffee-base text-cream-100 border-coffee-base'
                  : 'bg-white text-cafeteria-700 border-cafeteria-200 hover:border-dourado-base'
              }`}
            >
              <span className="sm:hidden">{curto}</span>
              <span className="hidden sm:inline">{u.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-dourado-200/70 bg-white/95 p-4 sm:p-5">
        <span
          className={`inline-block rounded-full text-xs font-semibold px-2.5 py-0.5 mb-2 ${
            aba === 'semanal' ? 'bg-sky-100 text-sky-900' : 'bg-dourado-100 text-dourado-900'
          }`}
        >
          {etiquetaPeriodo}
        </span>
        <h3 className="text-base font-semibold text-cafeteria-800">
          Top 3 · Avaliação · {labelUnidade} · {periodoLabel}
        </h3>
        <p className="text-sm text-cafeteria-600 mt-1 mb-4">{subtituloAvaliacao}</p>
        {top3.length > 0 ? (
          <PodioTop3 itens={top3} modo={podioModo} />
        ) : (
          <p className="text-sm text-cafeteria-600 py-4 text-center">
            Ainda sem ranking de avaliação para {labelUnidade} neste período.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dourado-200/70 bg-white/95 p-4 sm:p-5">
        <span
          className={`inline-block rounded-full text-xs font-semibold px-2.5 py-0.5 mb-2 ${
            aba === 'semanal' ? 'bg-sky-100 text-sky-900' : 'bg-dourado-100 text-dourado-900'
          }`}
        >
          {etiquetaPeriodo}
        </span>
        <h3 className="text-base font-semibold text-cafeteria-800">
          Top 3 · Troféus · {labelUnidade} · {periodoLabel}
        </h3>
        <p className="text-sm text-cafeteria-600 mt-1 mb-4">{subtituloTrofeus}</p>
        {top3Trofeus.length > 0 ? (
          <PodioTop3Trofeus itens={top3Trofeus} periodo={trofeusPeriodo} />
        ) : (
          <p className="text-sm text-cafeteria-600 py-4 text-center">
            Ainda sem ranking de troféus para {labelUnidade} neste período.
          </p>
        )}

        {top3Trofeus.length > 0 && restoTrofeus.length > 0 && !trofeusExpandido && (
          <button
            type="button"
            onClick={() => setTrofeusExpandido(true)}
            className="mt-4 w-full rounded-lg border border-dourado-300 bg-cream-50 px-4 py-2.5 text-sm font-medium text-coffee-base hover:bg-dourado-50 min-h-[44px]"
          >
            Ver mais ({restoTrofeus.length} {restoTrofeus.length === 1 ? 'colocado' : 'colocados'})
          </button>
        )}

        {top3Trofeus.length > 0 && trofeusExpandido && restoTrofeus.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-cream-200 pt-4">
            {restoVisivel.map((item) => (
              <LinhaRankingTrofeu
                key={`trof-${item.colaborador_id}`}
                item={item}
                periodo={trofeusPeriodo}
              />
            ))}
            {restoRestantes > 0 && (
              <button
                type="button"
                onClick={() => setTrofeusVisiveis((n) => Math.min(restoTrofeus.length, n + loteTrofeus))}
                className="w-full rounded-lg border border-dourado-300 bg-cream-50 px-4 py-2.5 text-sm font-medium text-coffee-base hover:bg-dourado-50 min-h-[44px]"
              >
                Ver mais ({proximosTrofeus} {proximosTrofeus === 1 ? 'colocado' : 'colocados'})
              </button>
            )}
          </div>
        )}
      </div>

      <Link
        href="/portal/mural"
        className="flex w-full justify-center min-h-[44px] items-center rounded-xl border border-dourado-base/50 bg-white px-4 py-2.5 text-sm font-semibold text-dourado-base hover:bg-dourado-50 transition-colors"
      >
        Ver ranking completo no mural
      </Link>
    </div>
  );
}
