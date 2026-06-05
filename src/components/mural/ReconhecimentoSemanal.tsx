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

type Props = {
  /** Na home: top 3 geral + botões para expandir unidade e troféus. */
  compacto?: boolean;
};

function BotaoExpandir({
  label,
  aberto,
  onClick,
  quantidade,
}: {
  label: string;
  aberto: boolean;
  onClick: () => void;
  quantidade: number;
}) {
  if (quantidade === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      className="flex-1 min-w-[140px] rounded-xl border-2 border-dourado-base/50 bg-white px-4 py-3 text-sm font-medium text-cafeteria-800 hover:border-dourado-base hover:bg-dourado-50/50 transition-colors"
    >
      <span className="flex items-center justify-center gap-2">
        <svg
          className={`w-4 h-4 shrink-0 text-dourado-base transition-transform ${aberto ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
        {aberto ? `Ocultar ${label}` : `Ver ${label}`}
      </span>
    </button>
  );
}

export function ReconhecimentoSemanal({ compacto = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [geralTop3, setGeralTop3] = useState<RankingAvaliacaoItem[]>([]);
  const [porUnidade, setPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [trofeus, setTrofeus] = useState<RankingTrofeuItem[]>([]);
  const [abrirUnidade, setAbrirUnidade] = useState(false);
  const [abrirTrofeus, setAbrirTrofeus] = useState(false);

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
        <XicaraCarregando size="sm" label="Carregando destaques…" />
      </div>
    );
  }

  const temConteudo = geralTop3.length > 0 || porUnidade.length > 0 || trofeus.length > 0;
  const periodo = semanaRotulo || 'esta semana';
  const totalUnidades = porUnidade.reduce((n, b) => n + b.top.length, 0);

  if (!temConteudo) {
    return (
      <p className="text-sm text-cafeteria-700 rounded-xl border border-dourado-200 bg-cream-50 p-4">
        Ainda não há destaques desta semana. Aparecem quando a liderança registra avaliações ou quando os colegas
        enviam troféus entre pares.
      </p>
    );
  }

  if (!compacto) {
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

  return (
    <div className="space-y-4">
      {geralTop3.length > 0 ? (
        <BlocoTop3Geral
          titulo={`Top 3 da rede · ${periodo}`}
          subtitulo="Melhores notas da semana — igual para toda a equipe."
          itens={geralTop3}
          modo="semanal"
        />
      ) : (
        <p className="text-sm text-cafeteria-600 rounded-xl border border-dourado-200 bg-cream-50 p-4">
          Top 3 da rede ainda não disponível nesta semana.
        </p>
      )}

      {(porUnidade.length > 0 || trofeus.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          <BotaoExpandir
            label="por unidade"
            aberto={abrirUnidade}
            onClick={() => setAbrirUnidade((v) => !v)}
            quantidade={totalUnidades}
          />
          <BotaoExpandir
            label="troféus"
            aberto={abrirTrofeus}
            onClick={() => setAbrirTrofeus((v) => !v)}
            quantidade={trofeus.length}
          />
        </div>
      )}

      {abrirUnidade && porUnidade.length > 0 && (
        <BlocoTop3PorUnidade
          titulo={`Por unidade · ${periodo}`}
          subtitulo="Melhores notas de cada loja nesta semana."
          blocos={porUnidade}
          modo="semanal"
        />
      )}

      {abrirTrofeus && trofeus.length > 0 && (
        <BlocoRankingTrofeus
          titulo={`Troféus entre pares · ${periodo}`}
          subtitulo="Reconhecimentos enviados pelos colegas nesta semana."
          itens={trofeus}
          periodo="semanal"
        />
      )}
    </div>
  );
}
