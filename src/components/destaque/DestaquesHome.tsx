'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPortalSession } from '@/lib/utils/session';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';
import { PodioTop3 } from '@/components/portal/vivo/PodioTop3';
import {
  rotuloMes,
  SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE,
  SUBTITULO_RANKING_AVALIACAO_SEMANAL,
  type RankingAvaliacaoItem,
  type RankingPorUnidade,
} from '@/components/mural/ranking-ui';
import {
  DESTAQUE_ABAS_UNIDADE,
  type DestaqueAbaUnidadeId,
  normalizarPorUnidade,
  normalizarTop3Geral,
  top3DestaquePorAba,
} from '@/lib/destaques-home-unidades';

type Props = {
  aba: 'semanal' | 'mensal';
};

/** Home: Semanal/Mensal + abas Geral / unidades; só top 3 (pódio). */
export function DestaquesHome({ aba }: Props) {
  const [loading, setLoading] = useState(true);
  const [abaUnidade, setAbaUnidade] = useState<DestaqueAbaUnidadeId>('geral');
  const [semanaRotulo, setSemanaRotulo] = useState('');
  const [semanalGeral, setSemanalGeral] = useState<RankingAvaliacaoItem[]>([]);
  const [semanalPorUnidade, setSemanalPorUnidade] = useState<RankingPorUnidade[]>([]);
  const [mesRef, setMesRef] = useState('');
  const [mensalGeral, setMensalGeral] = useState<RankingAvaliacaoItem[]>([]);
  const [mensalPorUnidade, setMensalPorUnidade] = useState<RankingPorUnidade[]>([]);

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
          setSemanalGeral(normalizarTop3Geral(sem.ranking_geral_top3));
          setSemanalPorUnidade(normalizarPorUnidade(sem.ranking_por_unidade));
        }
        if (mes?.ok === true) {
          setMesRef(String(mes.mes_referencia ?? ''));
          setMensalGeral(normalizarTop3Geral(mes.ranking_geral_top3));
          setMensalPorUnidade(normalizarPorUnidade(mes.ranking_por_unidade));
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

  const subtitulo = aba === 'semanal' ? SUBTITULO_RANKING_AVALIACAO_SEMANAL : SUBTITULO_RANKING_AVALIACAO_MENSAL_REDE;

  const labelUnidade = DESTAQUE_ABAS_UNIDADE.find((u) => u.id === abaUnidade)?.label ?? 'Geral';

  const vazioTotal =
    semanalGeral.length === 0 &&
    mensalGeral.length === 0 &&
    semanalPorUnidade.length === 0 &&
    mensalPorUnidade.length === 0;

  if (vazioTotal) {
    return (
      <p className="text-sm text-cafeteria-700 rounded-xl border border-dourado-200 bg-cream-50 p-4">
        Os reconhecimentos aparecem quando a liderança registra avaliações semanais. Rankings completos no{' '}
        <Link href="/portal/mural" className="text-dourado-base font-medium hover:underline">
          mural
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Unidade do ranking"
      >
        {DESTAQUE_ABAS_UNIDADE.map((u) => {
          const ativo = abaUnidade === u.id;
          return (
            <button
              key={u.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAbaUnidade(u.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium min-h-[40px] border transition-colors ${
                ativo
                  ? 'bg-coffee-base text-cream-100 border-coffee-base'
                  : 'bg-white text-cafeteria-700 border-cafeteria-200 hover:border-dourado-base'
              }`}
            >
              {u.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-dourado-200/70 bg-white/95 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-cafeteria-800">
          Top 3 · {labelUnidade} · {periodoLabel}
        </h3>
        <p className="text-sm text-cafeteria-600 mt-1 mb-4 leading-relaxed">{subtitulo}</p>
        {top3.length > 0 ? (
          <PodioTop3 itens={top3} modo={aba === 'semanal' ? 'semanal' : 'mensal'} />
        ) : (
          <p className="text-sm text-cafeteria-600 py-4 text-center">
            Ainda sem ranking para {labelUnidade} neste período.
          </p>
        )}
      </div>

      <p className="text-xs text-cafeteria-600 text-center">
        <Link href="/portal/mural" className="text-dourado-base font-medium hover:underline">
          Ver mural completo
        </Link>
      </p>
    </div>
  );
}
