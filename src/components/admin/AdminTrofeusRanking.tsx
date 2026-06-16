'use client';

import type { RankingTrofeuAgregado } from '@/lib/trofeus-pares-ranking';

function medalha(posicao: number): string {
  if (posicao === 1) return '🥇';
  if (posicao === 2) return '🥈';
  if (posicao === 3) return '🥉';
  return `${posicao}º`;
}

export function AdminTrofeusRanking({ itens }: { itens: RankingTrofeuAgregado[] }) {
  if (itens.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-coffee-100">
        Nenhum troféu no período. Ajuste as datas ou aguarde envios dos colaboradores.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cream-200">
      {itens.map((item) => (
        <li key={item.destinatario_id} className="px-4 py-3 hover:bg-cream-50/80">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-lg shrink-0 w-8 text-center" aria-hidden>
              {medalha(item.posicao)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-coffee-base leading-snug">{item.destinatario_nome}</p>
              <p className="text-xs text-coffee-100 mt-0.5">{item.unidade_nome}</p>
            </div>
            <p className="text-sm font-medium text-dourado-700 shrink-0">
              {item.total_trofeus} troféu{item.total_trofeus === 1 ? '' : 's'}
            </p>
          </div>
          {item.trofeus.length > 0 && (
            <p className="mt-2 ml-11 text-sm text-coffee-base leading-relaxed">
              {item.trofeus.map((t, idx) => (
                <span key={t.tipo}>
                  {idx > 0 ? ' · ' : ''}
                  <span title={t.titulo}>
                    {t.emoji} {t.titulo}
                    {t.quantidade > 1 ? ` ×${t.quantidade}` : ''}
                  </span>
                </span>
              ))}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
