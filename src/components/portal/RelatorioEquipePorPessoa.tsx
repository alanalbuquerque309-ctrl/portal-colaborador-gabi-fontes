'use client';

import { useMemo, useState } from 'react';
import type { LinhaDiariaRelatorio } from '@/components/portal/RelatorioAvaliacoesPorSetor';
import {
  filtrarLinhasEquipe,
  formatarSemanaCurta,
  rotuloAvaliador,
  type FiltroOrigemEquipe,
} from '@/lib/relatorio-equipe-utils';
import { DetalheAvaliacaoLinha, MediaBadge } from '@/components/portal/RelatorioEquipeDetalheLinha';

export type { FiltroOrigemEquipe };

type GrupoPessoa = {
  nome: string;
  setor: string;
  filial: string;
  linhas: LinhaDiariaRelatorio[];
};

function agruparPorPessoa(linhas: LinhaDiariaRelatorio[]): GrupoPessoa[] {
  const map = new Map<string, GrupoPessoa>();
  for (const l of linhas) {
    const nome = String(l.colaborador_nome ?? '').trim() || '—';
    if (!map.has(nome)) {
      map.set(nome, {
        nome,
        setor: l.colaborador_setor?.trim() || '—',
        filial: l.colaborador_unidade_nome?.trim() || '—',
        linhas: [],
      });
    }
    map.get(nome)!.linhas.push(l);
  }

  return Array.from(map.values())
    .map((g) => ({
      ...g,
      linhas: [...g.linhas].sort((a, b) => {
        const d = b.data_referencia.localeCompare(a.data_referencia);
        if (d !== 0) return d;
        if (a.origem_visita_rh === b.origem_visita_rh) return 0;
        return a.origem_visita_rh ? 1 : -1;
      }),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function RelatorioEquipePorPessoa({
  linhas,
  filtroOrigem = 'todos',
  busca = '',
}: {
  linhas: LinhaDiariaRelatorio[];
  filtroOrigem?: FiltroOrigemEquipe;
  busca?: string;
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const grupos = useMemo(
    () => agruparPorPessoa(filtrarLinhasEquipe(linhas, filtroOrigem, busca)),
    [linhas, filtroOrigem, busca]
  );

  const toggle = (nome: string) => {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  if (grupos.length === 0) {
    return (
      <p className="text-sm text-cafeteria-500 py-8 text-center">
        Nenhuma avaliação no período com estes filtros.
      </p>
    );
  }

  return (
    <ul className="space-y-2 list-none p-0 m-0">
      {grupos.map((g) => {
        const aberto = abertos.has(g.nome);
        const mediaGeral =
          g.linhas.reduce((s, l) => s + (l.media_dia ?? 0), 0) / Math.max(1, g.linhas.length);
        const pendenciasRh = new Set(
          g.linhas.filter((l) => !l.origem_visita_rh).map((l) => l.data_referencia)
        );
        for (const l of g.linhas) {
          if (l.origem_visita_rh) pendenciasRh.delete(l.data_referencia);
        }
        const qtdPendenteRh = pendenciasRh.size;

        return (
          <li
            key={g.nome}
            className="rounded-xl border border-cafeteria-200 bg-white overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(g.nome)}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-cream-50/80"
            >
              <div>
                <p className="font-semibold text-cafeteria-900">{g.nome}</p>
                <p className="text-xs text-cafeteria-500 mt-0.5">
                  {g.setor} · {g.filial}
                  {qtdPendenteRh > 0 && (
                    <span className="text-amber-700 ml-1">
                      · {qtdPendenteRh} sem Visita RH
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right text-xs text-cafeteria-600">
                <p>{g.linhas.length} registro{g.linhas.length === 1 ? '' : 's'}</p>
                <p>média {mediaGeral.toFixed(2)}</p>
              </div>
            </button>
            {aberto && (
              <div className="border-t border-cafeteria-100 px-4 py-3 bg-cream-50/40 space-y-3">
                {g.linhas.map((l) => {
                  const tipo = l.origem_visita_rh ? 'rh' : 'gerente';
                  return (
                    <div
                      key={l.id}
                      className="flex flex-wrap items-start justify-between gap-2 text-sm border-b border-cafeteria-100/80 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-cafeteria-800">
                          <span className="font-medium text-cafeteria-900">
                            Sem. {formatarSemanaCurta(l.data_referencia)}
                          </span>
                          {' · '}
                          <span
                            className={
                              tipo === 'rh'
                                ? 'text-sky-800 font-medium'
                                : 'text-dourado-800 font-medium'
                            }
                          >
                            {rotuloAvaliador(l)}
                          </span>
                        </p>
                        <DetalheAvaliacaoLinha l={l} />
                      </div>
                      <MediaBadge media={l.media_dia} />
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
