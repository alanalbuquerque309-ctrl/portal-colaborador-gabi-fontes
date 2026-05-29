'use client';

import { useState } from 'react';
import type { PendenciaVisitaRh } from '@/lib/relatorio-equipe-utils';
import { formatarSemanaCurta } from '@/lib/relatorio-equipe-utils';

export function AlertaPendenciasVisitaRh({ pendencias }: { pendencias: PendenciaVisitaRh[] }) {
  const [aberto, setAberto] = useState(true);

  if (pendencias.length === 0) return null;

  const porSemana = new Map<string, PendenciaVisitaRh[]>();
  for (const p of pendencias) {
    const list = porSemana.get(p.data_referencia) ?? [];
    list.push(p);
    porSemana.set(p.data_referencia, list);
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="font-semibold text-amber-900">
            {pendencias.length} Visita RH pendente{pendencias.length === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            Gerente já avaliou na semana, mas a Keila ainda não registrou visita complementar.
          </p>
        </div>
        <span className="text-amber-800 text-sm shrink-0 w-6 text-center" aria-hidden>
          {aberto ? '▲' : '▼'}
        </span>
      </button>
      {aberto && (
        <div className="border-t border-amber-200/80 px-3 sm:px-4 pb-4 pt-2">
          <ul
            className="space-y-4 list-none m-0 max-h-80 overflow-y-auto overscroll-y-contain pr-1 sm:pr-2 [scrollbar-gutter:stable]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {Array.from(porSemana.entries())
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([semana, itens]) => (
                <li key={semana}>
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2 px-1">
                    Semana {formatarSemanaCurta(semana)}
                  </p>
                  <ul className="space-y-2 list-none m-0 p-0">
                    {itens.map((p) => (
                      <li
                        key={`${p.data_referencia}-${p.colaborador_nome}`}
                        className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-4 items-center rounded-lg bg-white/50 border border-amber-200/60 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-amber-950 leading-snug">
                            {p.colaborador_nome}
                          </p>
                          <p className="text-xs text-amber-800/85 mt-0.5 leading-relaxed">
                            {[p.colaborador_setor, p.colaborador_unidade_nome]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <span className="inline-flex flex-col items-start sm:items-end gap-0.5 min-w-[5.5rem]">
                            <span className="text-[10px] uppercase tracking-wide text-amber-800/90">
                              Nota gerente
                            </span>
                            <span className="text-base font-semibold text-amber-950 tabular-nums leading-none">
                              {p.media_gerente != null ? p.media_gerente.toFixed(2) : '—'}
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
