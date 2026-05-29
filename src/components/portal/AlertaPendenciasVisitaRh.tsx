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
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-2"
      >
        <div>
          <p className="font-semibold text-amber-900">
            {pendencias.length} Visita RH pendente{pendencias.length === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Gerente já avaliou na semana, mas a Keila ainda não registrou visita complementar.
          </p>
        </div>
        <span className="text-amber-800 text-sm shrink-0">{aberto ? '▲' : '▼'}</span>
      </button>
      {aberto && (
        <ul className="border-t border-amber-200/80 px-4 py-3 space-y-3 list-none m-0 max-h-64 overflow-y-auto">
          {Array.from(porSemana.entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([semana, itens]) => (
              <li key={semana}>
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1.5">
                  Semana {formatarSemanaCurta(semana)}
                </p>
                <ul className="space-y-1 list-none m-0 p-0">
                  {itens.map((p) => (
                    <li
                      key={`${p.data_referencia}-${p.colaborador_nome}`}
                      className="text-sm text-amber-950 flex flex-wrap justify-between gap-x-2"
                    >
                      <span>
                        {p.colaborador_nome}
                        <span className="text-amber-800/80 text-xs ml-1">
                          · {[p.colaborador_setor, p.colaborador_unidade_nome]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </span>
                      <span className="text-xs text-amber-800 tabular-nums">
                        gerente {p.media_gerente != null ? p.media_gerente.toFixed(2) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
