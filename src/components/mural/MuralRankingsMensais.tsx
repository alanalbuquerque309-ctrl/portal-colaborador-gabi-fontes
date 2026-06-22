'use client';

import { useEffect, useState } from 'react';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalEmptyState } from '@/components/portal/shell/PortalEmptyState';
import {
  BlocoTop3PorUnidade,
  BlocoRankingTrofeus,
  BlocoTop3Geral,
  rotuloMes,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE,
  SUBTITULO_RANKING_AVALIACAO_SEMANAL,
  SUBTITULO_RANKING_TROFEUS_MENSAL,
  SUBTITULO_RANKING_TROFEUS_SEMANAL,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
  type RankingTrofeuItem,
} from '@/components/mural/ranking-ui';
import { PodioTop3 } from '@/components/portal/vivo/PodioTop3';

export function MuralRankingsMensais() {
  const [aba, setAba] = useState<'semanal' | 'mensal'>('semanal');
  const [loading, setLoading] = useState(true);
  const [mesRef, setMesRef] = useState('');
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [semanaRotuloTrofeus, setSemanaRotuloTrofeus] = useState('');
  const [minSemanas, setMinSemanas] = useState(1);
  const [semanalGeral, setSemanalGeral] = useState<RankingAvaliacaoItem[]>([]);
  const [semanalPorUnidade, setSemanalPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [semanalTrofeus, setSemanalTrofeus] = useState<RankingTrofeuItem[]>([]);
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
          setSemanalGeral(Array.isArray(sem.ranking_geral_top3) ? sem.ranking_geral_top3 : []);
          setSemanalPorUnidade(Array.isArray(sem.ranking_por_unidade) ? sem.ranking_por_unidade : []);
          setSemanalTrofeus(Array.isArray(sem.ranking_trofeus) ? sem.ranking_trofeus : []);
        }
        if (mes?.ok === true) {
          setMesRef(String(mes.mes_referencia ?? ''));
          setMinSemanas(Number(mes.min_semanas_ranking_mensal ?? 1));
          setMensalGeral(Array.isArray(mes.ranking_geral_top3) ? mes.ranking_geral_top3 : []);
          setMensalPorUnidade(Array.isArray(mes.ranking_por_unidade) ? mes.ranking_por_unidade : []);
          setMensalTrofeus(Array.isArray(mes.ranking_trofeus) ? mes.ranking_trofeus : []);
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando rankings…" />
      </div>
    );
  }

  const geralTop3 = aba === 'semanal' ? semanalGeral : mensalGeral;
  const porUnidade = aba === 'semanal' ? semanalPorUnidade : mensalPorUnidade;
  const trofeus = aba === 'semanal' ? semanalTrofeus : mensalTrofeus;
  const modo = aba;
  const periodoRotulo =
    aba === 'semanal'
      ? semanaRotulo || 'esta semana'
      : mesRef
        ? rotuloMes(mesRef)
        : 'este mês';
  const periodoRotuloTrofeus =
    aba === 'semanal' ? semanaRotuloTrofeus || semanaRotulo || 'esta semana' : periodoRotulo;

  const temAvaliacoes = geralTop3.length > 0 || porUnidade.length > 0;
  const temTrofeus = trofeus.length > 0;

  if (!temAvaliacoes && !temTrofeus) {
    return (
      <PortalEmptyState
        message={`Os destaques aparecem conforme as avaliações semanais vão entrando (mínimo de ${minSemanas} semana por colaborador no mensal) e os troféus entre pares se acumulam.`}
      />
    );
  }

  const subtituloAvaliacao =
    aba === 'semanal' ? SUBTITULO_RANKING_AVALIACAO_SEMANAL : SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE;
  const subtituloUnidade =
    aba === 'semanal' ? SUBTITULO_RANKING_AVALIACAO_SEMANAL : SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE;
  const subtituloTrofeus =
    aba === 'semanal' ? SUBTITULO_RANKING_TROFEUS_SEMANAL : SUBTITULO_RANKING_TROFEUS_MENSAL;

  return (
    <div className="space-y-6">
      <div
        className="inline-flex rounded-xl border border-dourado-base/40 bg-white p-1"
        role="tablist"
        aria-label="Período do ranking"
      >
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'semanal'}
          onClick={() => setAba('semanal')}
          className={`rounded-lg px-4 py-2 text-sm font-medium min-h-[40px] transition-colors ${
            aba === 'semanal'
              ? 'bg-portal-action text-white shadow-sm'
              : 'text-cafeteria-700 hover:bg-cream-50'
          }`}
        >
          Semanal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'mensal'}
          onClick={() => setAba('mensal')}
          className={`rounded-lg px-4 py-2 text-sm font-medium min-h-[40px] transition-colors ${
            aba === 'mensal'
              ? 'bg-dourado-base text-coffee-base shadow-sm'
              : 'text-cafeteria-700 hover:bg-cream-50'
          }`}
        >
          Mensal
        </button>
      </div>

      {geralTop3.length > 0 ? (
        <section className="rounded-2xl border border-dourado-200 bg-white/95 p-5 shadow-sm space-y-4">
          <PodioTop3 itens={geralTop3.slice(0, 3)} modo={modo} />
          <BlocoTop3Geral
            titulo={`Destaques da rede · ${periodoRotulo}`}
            subtitulo={subtituloAvaliacao}
            itens={geralTop3}
            modo={modo}
          />
        </section>
      ) : (
        <p className="text-sm text-cafeteria-600 rounded-xl border border-dourado-200 bg-cream-50 p-4">
          Ainda sem ranking de avaliação da rede neste período ({periodoRotulo}).
        </p>
      )}

      <BlocoTop3PorUnidade
        titulo={`Destaques por unidade · ${periodoRotulo}`}
        subtitulo={subtituloUnidade}
        blocos={porUnidade}
        modo={modo}
      />

      {temTrofeus ? (
        <BlocoRankingTrofeus
          titulo={`Troféus entre pares · ${periodoRotuloTrofeus}`}
          subtitulo={subtituloTrofeus}
          itens={trofeus}
          periodo={modo}
        />
      ) : (
        <p className="text-sm text-cafeteria-600 rounded-xl border border-dourado-200 bg-cream-50 p-4">
          Ainda sem troféus entre pares neste período ({periodoRotuloTrofeus}).
        </p>
      )}
    </div>
  );
}
