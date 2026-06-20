'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PortalEmptyState } from '@/components/portal/shell/PortalEmptyState';
import {
  BlocoTop3PorUnidade,
  BlocoRankingTrofeus,
  CardRankingAvaliacao,
  rotuloMes,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE,
  SUBTITULO_RANKING_TROFEUS_MENSAL,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
  type RankingTrofeuItem,
} from '@/components/mural/ranking-ui';
import { PodioTop3 } from '@/components/portal/vivo/PodioTop3';

export function MuralRankingsMensais() {
  const [loading, setLoading] = useState(true);
  const [mesRef, setMesRef] = useState('');
  const [geralTop3, setGeralTop3] = useState<RankingAvaliacaoItem[]>([]);
  const [porUnidade, setPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [trofeus, setTrofeus] = useState<RankingTrofeuItem[]>([]);
  const [minSemanas, setMinSemanas] = useState(1);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    void fetch('/api/portal/destaque', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok !== true) return;
        setMesRef(String(data.mes_referencia ?? ''));
        setMinSemanas(Number(data.min_semanas_ranking_mensal ?? 1));
        setGeralTop3(Array.isArray(data.ranking_geral_top3) ? data.ranking_geral_top3 : []);
        setPorUnidade(Array.isArray(data.ranking_por_unidade) ? data.ranking_por_unidade : []);
        setTrofeus(Array.isArray(data.ranking_trofeus) ? data.ranking_trofeus : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando rankings do mês…" />
      </div>
    );
  }

  const temAvaliacoes = geralTop3.length > 0 || porUnidade.length > 0;
  const temTrofeus = trofeus.length > 0;
  const mesRotulo = mesRef ? rotuloMes(mesRef) : 'este mês';

  if (!temAvaliacoes && !temTrofeus) {
    return (
      <PortalEmptyState
        message={`Os destaques do mês aparecem aqui conforme as avaliações semanais vão entrando (mínimo de ${minSemanas} semana por colaborador) e os troféus entre pares se acumulam até o fechamento do mês.`}
      />
    );
  }

  return (
    <div className="space-y-8">
      {geralTop3.length > 0 && (
        <section className="rounded-2xl border border-dourado-200 bg-white/95 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-cafeteria-800 mb-0.5">{`Destaques do mês · ${mesRotulo}`}</h3>
          <p className="text-sm text-cafeteria-600 mb-4 leading-relaxed">{SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE}</p>
          <PodioTop3 itens={geralTop3.slice(0, 3)} modo="mensal" />
          <div className="mt-4 space-y-2 border-t border-cream-200 pt-4">
            {geralTop3.map((item) => (
              <CardRankingAvaliacao key={item.colaborador_id} item={item} modo="mensal" />
            ))}
          </div>
        </section>
      )}
      <BlocoTop3PorUnidade
        titulo={`Destaques por unidade · ${mesRotulo}`}
        subtitulo={SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE}
        blocos={porUnidade}
        modo="mensal"
      />
      <BlocoRankingTrofeus
        titulo={`Troféus entre pares · ${mesRotulo}`}
        subtitulo={SUBTITULO_RANKING_TROFEUS_MENSAL}
        itens={trofeus}
        periodo="mensal"
      />
    </div>
  );
}
