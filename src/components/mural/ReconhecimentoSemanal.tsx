'use client';

import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import {
  BlocoTop3Geral,
  BlocoTop3PorUnidade,
  BlocoRankingTrofeus,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
  type RankingTrofeuItem,
} from '@/components/mural/ranking-ui';

export function ReconhecimentoSemanal() {
  const [loading, setLoading] = useState(true);
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [geralTop3, setGeralTop3] = useState<RankingAvaliacaoItem[]>([]);
  const [porUnidade, setPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [trofeus, setTrofeus] = useState<RankingTrofeuItem[]>([]);

  useEffect(() => {
    const session = getPortalSession();
    if (!session?.colaboradorId) {
      setLoading(false);
      return;
    }

    void fetch('/api/portal/reconhecimento-semanal', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok !== true) return;
        setSemanaRotulo(String(data.semana_rotulo ?? ''));
        setGeralTop3(Array.isArray(data.ranking_geral_top3) ? data.ranking_geral_top3 : []);
        setPorUnidade(Array.isArray(data.ranking_por_unidade) ? data.ranking_por_unidade : []);
        setTrofeus(Array.isArray(data.ranking_trofeus) ? data.ranking_trofeus : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <XicaraCarregando size="sm" label="Carregando reconhecimento semanal…" />
      </div>
    );
  }

  const temConteudo = geralTop3.length > 0 || porUnidade.length > 0 || trofeus.length > 0;
  const periodo = semanaRotulo || 'esta semana';

  if (!temConteudo) {
    return (
      <p className="text-sm text-cafeteria-700 rounded-xl border border-dourado-200 bg-cream-50 p-4">
        Ainda não há destaques desta semana. Aparecem quando a liderança registra avaliações ou quando os
        colegas enviam troféus entre pares.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <BlocoTop3Geral
        titulo={`Top 3 da rede · ${periodo}`}
        subtitulo="Melhores notas de avaliação da equipe nesta semana (atualiza toda segunda)."
        itens={geralTop3}
        modo="semanal"
      />
      <BlocoTop3PorUnidade
        titulo={`Top 3 por unidade · ${periodo}`}
        subtitulo="Melhores notas de cada loja nesta semana."
        blocos={porUnidade}
        modo="semanal"
      />
      <BlocoRankingTrofeus
        titulo={`Troféus entre pares · ${periodo}`}
        subtitulo="Reconhecimentos enviados pelos colegas nesta semana."
        itens={trofeus}
        periodo="semanal"
      />
    </div>
  );
}
