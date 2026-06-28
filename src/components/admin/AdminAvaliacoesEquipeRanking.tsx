'use client';

import { useMemo, useState } from 'react';
import {
  agruparLinhasAdminPorColaboradorPeriodo,
  filtrarLinhasAdminBusca,
  rankearGruposPeriodo,
  type LinhaAdminAvaliacaoEquipe,
  type OrdemRankingAdmin,
} from '@/lib/admin-avaliacoes-equipe-agrupar';
import { AdminAvaliacoesEquipeAgrupado } from '@/components/admin/AdminAvaliacoesEquipeAgrupado';
import { EvolucaoBadge } from '@/components/admin/EvolucaoBadge';
import type { SituacaoEvolucao } from '@/lib/evolucao';

type Props = {
  linhas: LinhaAdminAvaliacaoEquipe[];
  busca: string;
  ordem: OrdemRankingAdmin;
  podeVerDetalhe: boolean;
  podeIgnorar: boolean;
  gavetaId: string | null;
  onAbrirGaveta: (id: string) => void;
  onRecarregar: () => void;
  tendencias?: Record<string, { situacao: SituacaoEvolucao; delta: number | null }>;
};

function rotuloPosicao(posicao: number, media: number | null): string {
  if (media == null || posicao <= 0) return '—';
  if (posicao === 1) return '🥇';
  if (posicao === 2) return '🥈';
  if (posicao === 3) return '🥉';
  return `${posicao}º`;
}

function corMedia(media: number | null): string {
  if (media == null) return 'text-coffee-100';
  if (media < 3) return 'text-red-700';
  if (media >= 4.5) return 'text-emerald-700';
  return 'text-coffee-base';
}

export function AdminAvaliacoesEquipeRanking({
  linhas,
  busca,
  ordem,
  podeVerDetalhe,
  podeIgnorar,
  gavetaId,
  onAbrirGaveta,
  onRecarregar,
  tendencias,
}: Props) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  const rankeados = useMemo(() => {
    const filtradas = filtrarLinhasAdminBusca(linhas, busca);
    const grupos = agruparLinhasAdminPorColaboradorPeriodo(filtradas);
    return rankearGruposPeriodo(grupos, ordem);
  }, [linhas, busca, ordem]);

  if (rankeados.length === 0) {
    return (
      <p className="text-sm text-coffee-100 px-4 py-10 text-center">
        Nenhum registro com estes filtros.
      </p>
    );
  }

  const comMedia = rankeados.filter((g) => g.media_periodo != null).length;

  return (
    <div>
      <p className="text-xs text-coffee-100 px-4 py-2 border-b border-cream-200 bg-cream-50/80">
        Ranking no período filtrado: {comMedia} colaborador{comMedia === 1 ? '' : 'es'} com média numérica.
        {ordem === 'asc' ? ' Ordenado do menor para o maior (quem precisa atenção primeiro).' : ' Ordenado do maior para o menor.'}
      </p>
      <ul className="divide-y divide-cream-200 list-none m-0 p-0">
        {rankeados.map((g) => {
          const expandido = expandidoId === g.colaborador_id;
          const tend = tendencias?.[g.colaborador_id];
          const mediaLabel =
            g.media_periodo != null ? g.media_periodo.toFixed(2).replace('.', ',') : 'Isenta / sem nota';

          return (
            <li
              key={g.colaborador_id}
              className={`${g.media_periodo != null && g.media_periodo < 3 ? 'bg-red-50/25' : ''}`}
            >
              <button
                type="button"
                onClick={() => setExpandidoId(expandido ? null : g.colaborador_id)}
                className="w-full text-left px-4 py-3.5 hover:bg-cream-50/80 transition-colors flex flex-wrap items-center gap-3"
              >
                <span
                  className="text-xl font-display font-semibold tabular-nums w-10 shrink-0 text-center"
                  aria-label={g.posicao > 0 ? `Posição ${g.posicao}` : 'Sem posição no ranking'}
                >
                  {rotuloPosicao(g.posicao, g.media_periodo)}
                </span>
                <div className="min-w-0 flex-1 basis-[12rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-coffee-base text-base">{g.colaborador_nome}</span>
                    {tend && <EvolucaoBadge situacao={tend.situacao} compacto delta={tend.delta} />}
                  </div>
                  <p className="text-sm text-coffee-100 mt-0.5">
                    <span className="font-medium text-coffee-base/90">{g.setor}</span>
                    {' · '}
                    <span>{g.cargo}</span>
                    {g.unidade_nome !== '—' && (
                      <>
                        {' · '}
                        <span>{g.unidade_nome}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-coffee-100 mt-0.5">
                    {g.qtd_semanas_com_media} semana{g.qtd_semanas_com_media === 1 ? '' : 's'} com nota ·{' '}
                    {g.semanas.length} registro{g.semanas.length === 1 ? '' : 's'} no período
                  </p>
                </div>
                <div className="text-right shrink-0 min-w-[5rem]">
                  <p className="text-[10px] uppercase tracking-wide text-coffee-100">Média período</p>
                  <p className={`text-2xl font-display font-semibold tabular-nums ${corMedia(g.media_periodo)}`}>
                    {mediaLabel}
                  </p>
                </div>
                <span className="text-coffee-100 text-sm shrink-0" aria-hidden>
                  {expandido ? '▲' : '▼'}
                </span>
              </button>
              {expandido && (
                <div className="border-t border-cream-200 bg-cream-50/40">
                  <AdminAvaliacoesEquipeAgrupado
                    linhas={g.semanas.flatMap((s) => s.avaliacoes)}
                    busca=""
                    podeVerDetalhe={podeVerDetalhe}
                    podeIgnorar={podeIgnorar}
                    gavetaId={gavetaId}
                    onAbrirGaveta={onAbrirGaveta}
                    onRecarregar={onRecarregar}
                    tendencias={tendencias}
                    ordenacaoSemana="data"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
