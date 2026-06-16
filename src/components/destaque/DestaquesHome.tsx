'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import {
  BlocoTop3Geral,
  BlocoTop3PorUnidade,
  BlocoRankingTrofeus,
  rotuloMes,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE,
  SUBTITULO_RANKING_AVALIACAO_SEMANAL,
  SUBTITULO_RANKING_TROFEUS_MENSAL,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
  type RankingTrofeuItem,
} from '@/components/mural/ranking-ui';

function BotaoExpandir({
  label,
  aberto,
  onClick,
}: {
  label: string;
  aberto: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      className="flex-1 min-w-[8rem] rounded-lg border border-dourado-base/40 bg-white px-3 py-2.5 text-sm font-medium text-cafeteria-800 hover:border-dourado-base hover:bg-dourado-50/50 transition-colors min-h-[44px]"
    >
      {aberto ? `Ocultar ${label}` : label}
    </button>
  );
}

/** Home: top 3 semanal + resumo mensal compacto (geral fixo; unidade e troféus sob demanda). */
export function DestaquesHome() {
  const [loading, setLoading] = useState(true);
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [semanalTop3, setSemanalTop3] = useState<RankingAvaliacaoItem[]>([]);
  const [mesRef, setMesRef] = useState('');
  const [minSemanas, setMinSemanas] = useState(1);
  const [mensalGeralTop3, setMensalGeralTop3] = useState<RankingAvaliacaoItem[]>([]);
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

    void Promise.all([
      fetch('/api/portal/reconhecimento-semanal', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/portal/destaque', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([sem, mes]) => {
        if (sem?.ok === true) {
          setSemanaRotulo(String(sem.semana_rotulo ?? ''));
          setSemanalTop3(
            Array.isArray(sem.ranking_geral_top3) ? sem.ranking_geral_top3.slice(0, 3) : []
          );
        }
        if (mes?.ok === true) {
          setMesRef(String(mes.mes_referencia ?? ''));
          setMinSemanas(Number(mes.min_semanas_ranking_mensal ?? 1));
          setMensalGeralTop3(
            Array.isArray(mes.ranking_geral_top3) ? mes.ranking_geral_top3.slice(0, 3) : []
          );
          setPorUnidade(Array.isArray(mes.ranking_por_unidade) ? mes.ranking_por_unidade : []);
          setTrofeus(Array.isArray(mes.ranking_trofeus) ? mes.ranking_trofeus : []);
        }
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

  const mesRotulo = mesRef ? rotuloMes(mesRef) : 'este mês';
  const periodoSemana = semanaRotulo || 'esta semana';
  const temMensalExtra = porUnidade.length > 0 || trofeus.length > 0;
  const vazioTotal =
    semanalTop3.length === 0 && mensalGeralTop3.length === 0 && !temMensalExtra;

  if (vazioTotal) {
    return (
      <p className="text-sm text-cafeteria-700 rounded-xl border border-dourado-200 bg-cream-50 p-4">
        Os destaques aparecem quando a liderança registra avaliações semanais e os colegas enviam troféus.
        Rankings mensais completos ficam no{' '}
        <Link href="/portal/mural" className="text-dourado-base font-medium hover:underline">
          mural
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200/80 bg-white/90 p-4">
        {semanalTop3.length > 0 ? (
          <BlocoTop3Geral
            titulo={`Top 3 · ${periodoSemana}`}
            subtitulo={SUBTITULO_RANKING_AVALIACAO_SEMANAL}
            itens={semanalTop3}
            modo="semanal"
          />
        ) : (
          <p className="text-sm text-cafeteria-600">
            <span className="font-medium text-cafeteria-800">Esta semana:</span> top 3 ainda não disponível.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dourado-200/80 bg-white/90 p-4 space-y-3">
        {mensalGeralTop3.length > 0 ? (
          <BlocoTop3Geral
            titulo={`Top 3 do mês · ${mesRotulo}`}
            subtitulo={SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE}
            itens={mensalGeralTop3}
            modo="mensal"
          />
        ) : (
          <p className="text-sm text-cafeteria-600">
            <span className="font-medium text-cafeteria-800">Este mês:</span> ranking geral ainda em formação
            {minSemanas > 1 ? ` (mínimo ${minSemanas} semanas por pessoa)` : ''}.
          </p>
        )}

        {temMensalExtra && (
          <div className="flex flex-wrap gap-2 pt-1">
            {porUnidade.length > 0 && (
              <BotaoExpandir
                label="Ranking por unidade"
                aberto={abrirUnidade}
                onClick={() => setAbrirUnidade((v) => !v)}
              />
            )}
            {trofeus.length > 0 && (
              <BotaoExpandir
                label="Troféus do mês"
                aberto={abrirTrofeus}
                onClick={() => setAbrirTrofeus((v) => !v)}
              />
            )}
          </div>
        )}

        {abrirUnidade && porUnidade.length > 0 && (
          <BlocoTop3PorUnidade
            titulo={`Por unidade · ${mesRotulo}`}
            subtitulo={SUBTITULO_RANKING_AVALIACAO_MENSAL_UNIDADE}
            blocos={porUnidade}
            modo="mensal"
          />
        )}

        {abrirTrofeus && trofeus.length > 0 && (
          <BlocoRankingTrofeus
            titulo={`Troféus entre pares · ${mesRotulo}`}
            subtitulo={SUBTITULO_RANKING_TROFEUS_MENSAL}
            itens={trofeus}
            periodo="mensal"
          />
        )}
      </div>

      <p className="text-xs text-cafeteria-600 text-center">
        <Link href="/portal/mural" className="text-dourado-base font-medium hover:underline">
          Ver rankings completos no mural
        </Link>
      </p>
    </div>
  );
}
