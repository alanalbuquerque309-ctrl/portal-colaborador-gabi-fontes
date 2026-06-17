'use client';

import type { RankingTrofeuItem } from '@/components/mural/ranking-ui';

function AvatarPodio({ nome, foto }: { nome: string; foto: string | null }) {
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md"
      />
    );
  }
  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-dourado-100 border-2 border-white shadow-md flex items-center justify-center font-display text-xl text-dourado-700">
      {nome?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  );
}

const ESTILO_PODIO = [
  { h: 'h-16', bg: 'bg-gradient-to-t from-amber-600 to-amber-400', medal: '🥇', ring: 'ring-amber-300' },
  { h: 'h-12', bg: 'bg-gradient-to-t from-slate-400 to-slate-300', medal: '🥈', ring: 'ring-slate-200' },
  { h: 'h-10', bg: 'bg-gradient-to-t from-orange-700 to-orange-500', medal: '🥉', ring: 'ring-orange-200' },
] as const;

/** Pódio visual para troféus entre pares (mesmo layout da avaliação). */
export function PodioTop3Trofeus({
  itens,
  periodo,
}: {
  itens: RankingTrofeuItem[];
  periodo: 'semanal' | 'mensal';
}) {
  const top = itens.slice(0, 3);
  if (top.length === 0) return null;

  const primeiro = top.find((i) => i.posicao === 1) ?? top[0];
  const segundo = top.find((i) => i.posicao === 2) ?? top[1];
  const terceiro = top.find((i) => i.posicao === 3) ?? top[2];

  const colunas: (RankingTrofeuItem | undefined)[] = [segundo, primeiro, terceiro];
  const rotuloPeriodo = periodo === 'semanal' ? 'nesta semana' : 'no mês';

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 pt-2 pb-1">
      {colunas.map((item, ix) => {
        if (!item) {
          return <div key={`vazio-${ix}`} className="w-[30%] max-w-[7rem]" aria-hidden />;
        }
        const est = ESTILO_PODIO[item.posicao - 1] ?? ESTILO_PODIO[2];

        return (
          <div
            key={item.colaborador_id}
            className={`flex flex-col items-center w-[30%] max-w-[7rem] ${item.posicao === 1 ? '-mt-2' : ''}`}
          >
            <span className="text-xl sm:text-2xl mb-1" aria-hidden>
              {est.medal}
            </span>
            <div className={`rounded-full ring-2 ${est.ring} mb-2`}>
              <AvatarPodio nome={item.nome} foto={item.foto_url} />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-cafeteria-900 text-center leading-tight break-words line-clamp-2 w-full">
              {item.nome.split(' ')[0]}
            </p>
            <p className="text-xs font-bold text-dourado-700 mt-0.5 text-center">
              {item.total_trofeus} troféu{item.total_trofeus === 1 ? '' : 's'}
            </p>
            <p className="text-[10px] text-cafeteria-600 mt-0.5 text-center leading-tight">{rotuloPeriodo}</p>
            <div
              className={`mt-2 w-full rounded-t-lg ${est.h} ${est.bg} flex items-end justify-center pb-1 shadow-inner`}
            >
              <span className="text-white/90 text-sm font-bold">{item.posicao}º</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
