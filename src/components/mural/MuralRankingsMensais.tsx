'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { AniversariantesReconhecimento } from '@/components/mural/AniversariantesReconhecimento';
import {
  BlocoTop3Geral,
  BlocoTop3PorUnidade,
  BlocoRankingTrofeus,
  rotuloMes,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
  type RankingTrofeuItem,
} from '@/components/mural/ranking-ui';

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
      <div className="space-y-6">
        <p className="text-sm text-cafeteria-700 rounded-xl border border-dourado-200 bg-cream-50 p-4">
          Os destaques do mês aparecem aqui conforme as avaliações semanais vão entrando (mínimo de{' '}
          {minSemanas} semana por colaborador) e os troféus entre pares se acumulam até o fechamento do mês.
        </p>
        <AniversariantesReconhecimento />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BlocoTop3Geral
        titulo={`Destaques do mês · ${mesRotulo}`}
        subtitulo="Top 3 da rede pela média das notas semanais acumuladas no mês (em andamento até o dia 31)."
        itens={geralTop3}
        modo="mensal"
      />
      <BlocoTop3PorUnidade
        titulo={`Destaques por unidade · ${mesRotulo}`}
        subtitulo="Top 3 de cada loja pela média mensal das avaliações."
        blocos={porUnidade}
        modo="mensal"
      />
      <BlocoRankingTrofeus
        titulo={`Troféus entre pares · ${mesRotulo}`}
        subtitulo="Soma de todos os troféus recebidos no mês, por colaborador."
        itens={trofeus}
        periodo="mensal"
      />
      <AniversariantesReconhecimento />
    </div>
  );
}
