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
  ROTULO_PERIODO_RANKING_MENSAL,
  ROTULO_PERIODO_RANKING_SEMANAL,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE,
  SUBTITULO_RANKING_AVALIACAO_SEMANAL,
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

type Props = {
  aba: 'semanal' | 'mensal';
};

/** Home: pódio avaliação + pódio troféus; lista detalhada só após «Ver mais». */
export function DestaquesHome({ aba }: Props) {
  const [loading, setLoading] = useState(true);
  const [abaUnidade, setAbaUnidade] = useState<DestaqueAbaUnidadeId>('geral');
  const [trofeusExpandido, setTrofeusExpandido] = useState(false);
  const [trofeusVisiveis, setTrofeusVisiveis] = useState(4);
  const [periodoTrofeusAba, setPeriodoTrofeusAba] = useState<'semanal' | 'mensal'>('semanal');
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [semanaRotuloTrofeus, setSemanaRotuloTrofeus] = useState('');
  const [semanalGeral, setSemanalGeral] = useState<RankingAvaliacaoItem[]>([]);
  const [semanalPorUnidade, setSemanalPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [semanalTrofeus, setSemanalTrofeus] = useState<RankingTrofeuItem[]>([]);
  const [mesRef, setMesRef] = useState('');
  const [mensalGeral, setMensalGeral] = useState<RankingAvaliacaoItem[]>([]);
  const [mensalPorUnidade, setMensalPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [mensalTrofeus, setMensalTrofeus] = useState<RankingTrofeuItem[]>([]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);

    Promise.all([
      fetch('/api/portal/reconhecimento-semanal', { credentials: 'include', cache: 'no-store' }).then((r) =>
        r.json()
      ),
      fetch('/api/portal/destaque', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([sem, mes]) => {
        if (cancel) return;
        if (sem?.ok === true) {
          setSemanaRotulo(String(sem.semana_rotulo ?? ''));
          setSemanaRotuloTrofeus(String(sem.semana_rotulo_trofeus ?? sem.semana_rotulo ?? ''));
          setSemanalGeral(normalizarTop3Geral(sem.ranking_geral_top3));
          setSemanalPorUnidade(normalizarPorUnidade(sem.ranking_por_unidade));
          setSemanalTrofeus(normalizarTrofeus(sem.ranking_trofeus));
        }
        if (mes?.ok === true) {
          setMesRef(String(mes.mes_referencia ?? ''));
          setMensalGeral(normalizarTop3Geral(mes.ranking_geral_top3));
          setMensalPorUnidade(normalizarPorUnidade(mes.ranking_por_unidade));
          setMensalTrofeus(normalizarTrofeus(mes.ranking_trofeus));
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    setPeriodoTrofeusAba(aba);
  }, [aba]);

  useEffect(() => {
    setTrofeusExpandido(false);
    setTrofeusVisiveis(4);
  }, [aba, abaUnidade, periodoTrofeusAba]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando destaques…" />
      </div>
    );
  }

  const top3 =
    aba === 'semanal'
      ? top3DestaquePorAba(abaUnidade, semanalGeral, semanalPorUnidade)
      : top3DestaquePorAba(abaUnidade, mensalGeral, mensalPorUnidade);

  const periodoLabel =
    aba === 'semanal'
      ? semanaRotulo || 'esta semana'
      : mesRef
        ? rotuloMes(mesRef)
        : 'este mês';

  const periodoTrofeus = periodoTrofeusAba;

  const trofeusLista =
    periodoTrofeusAba === 'semanal'
      ? trofeusDestaquePorAba(abaUnidade, semanalTrofeus)
      : trofeusDestaquePorAba(abaUnidade, mensalTrofeus);

  const periodoLabelTrofeus =
    periodoTrofeusAba === 'semanal'
      ? semanaRotuloTrofeus || semanaRotulo || 'esta semana'
      : mesRef
        ? rotuloMes(mesRef)
        : 'este mês';

  const subtituloAvaliacao =
    aba === 'semanal' ? SUBTITULO_RANKING_AVALIACAO_SEMANAL : SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE;

  const subtituloTrofeus =
    periodoTrofeusAba === 'semanal'
      ? SUBTITULO_RANKING_TROFEUS_SEMANAL
      : SUBTITULO_RANKING_TROFEUS_MENSAL;

  const labelUnidade = DESTAQUE_ABAS_UNIDADE.find((u) => u.id === abaUnidade)?.label ?? 'Geral';
  const etiquetaPeriodo = aba === 'semanal' ? ROTULO_PERIODO_RANKING_SEMANAL : ROTULO_PERIODO_RANKING_MENSAL;

  const temAvaliacao =
    semanalGeral.length > 0 ||
    mensalGeral.length > 0 ||
    semanalPorUnidade.length > 0 ||
    mensalPorUnidade.length > 0;

  const temTrofeus = semanalTrofeus.length > 0 || mensalTrofeus.length > 0;

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
        <p className="text-sm text-cafeteria-600 mt-1 mb-4 leading-relaxed">{subtituloAvaliacao}</p>
        {top3.length > 0 ? (
          <PodioTop3 itens={top3} modo={aba} />
        ) : (
          <p className="text-sm text-cafeteria-600 py-4 text-center">
            Ainda sem ranking de avaliação para {labelUnidade} neste período.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dourado-200/70 bg-white/95 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <span
              className={`inline-block rounded-full text-xs font-semibold px-2.5 py-0.5 mb-2 ${
                periodoTrofeusAba === 'semanal'
                  ? 'bg-sky-100 text-sky-900'
                  : 'bg-dourado-100 text-dourado-900'
              }`}
            >
              {periodoTrofeusAba === 'semanal'
                ? ROTULO_PERIODO_RANKING_SEMANAL
                : ROTULO_PERIODO_RANKING_MENSAL}
            </span>
            <h3 className="text-base font-semibold text-cafeteria-800">
              Top 3 · Troféus entre pares · {labelUnidade} · {periodoLabelTrofeus}
            </h3>
            <p className="text-sm text-cafeteria-600 mt-1 leading-relaxed">{subtituloTrofeus}</p>
          </div>
          <div
            className="inline-flex rounded-xl border border-dourado-base/40 bg-cream-50 p-1 self-start shrink-0"
            role="tablist"
            aria-label="Período do ranking de troféus"
          >
            <button
              type="button"
              role="tab"
              aria-selected={periodoTrofeusAba === 'semanal'}
              onClick={() => setPeriodoTrofeusAba('semanal')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium min-h-[36px] transition-colors ${
                periodoTrofeusAba === 'semanal'
                  ? 'bg-portal-action text-white shadow-sm'
                  : 'text-cafeteria-700 hover:bg-white'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodoTrofeusAba === 'mensal'}
              onClick={() => setPeriodoTrofeusAba('mensal')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium min-h-[36px] transition-colors ${
                periodoTrofeusAba === 'mensal'
                  ? 'bg-dourado-base text-coffee-base shadow-sm'
                  : 'text-cafeteria-700 hover:bg-white'
              }`}
            >
              Mensal
            </button>
          </div>
        </div>
        {top3Trofeus.length > 0 ? (
          <PodioTop3Trofeus itens={top3Trofeus} periodo={periodoTrofeus} />
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
                periodo={periodoTrofeus}
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
