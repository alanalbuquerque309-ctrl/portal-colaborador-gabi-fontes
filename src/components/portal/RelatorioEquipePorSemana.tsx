'use client';

import { useMemo, useState } from 'react';
import type { LinhaDiariaRelatorio } from '@/components/portal/RelatorioAvaliacoesPorSetor';
import {
  filtrarLinhasEquipe,
  formatarSemanaCurta,
  type FiltroOrigemEquipe,
} from '@/lib/relatorio-equipe-utils';
import { DetalheAvaliacaoLinha, MediaBadge } from '@/components/portal/RelatorioEquipeDetalheLinha';

type LinhaSemanaPessoa = {
  nome: string;
  setor: string;
  filial: string;
  gerente?: LinhaDiariaRelatorio;
  rh?: LinhaDiariaRelatorio;
};

type GrupoSemana = {
  data_referencia: string;
  pessoas: LinhaSemanaPessoa[];
};

function agruparPorSemana(linhas: LinhaDiariaRelatorio[]): GrupoSemana[] {
  const porSemana = new Map<string, Map<string, LinhaSemanaPessoa>>();

  for (const l of linhas) {
    const semana = l.data_referencia;
    const nome = String(l.colaborador_nome ?? '').trim() || '—';
    if (!porSemana.has(semana)) porSemana.set(semana, new Map());
    const porNome = porSemana.get(semana)!;
    if (!porNome.has(nome)) {
      porNome.set(nome, {
        nome,
        setor: l.colaborador_setor?.trim() || '—',
        filial: l.colaborador_unidade_nome?.trim() || '—',
      });
    }
    const p = porNome.get(nome)!;
    if (l.origem_visita_rh) p.rh = l;
    else p.gerente = l;
  }

  return Array.from(porSemana.entries())
    .map(([data_referencia, porNome]) => ({
      data_referencia,
      pessoas: Array.from(porNome.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      ),
    }))
    .sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
}

export function RelatorioEquipePorSemana({
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
    () => agruparPorSemana(filtrarLinhasEquipe(linhas, filtroOrigem, busca)),
    [linhas, filtroOrigem, busca]
  );

  const toggle = (semana: string) => {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(semana)) next.delete(semana);
      else next.add(semana);
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
        const aberto = abertos.has(g.data_referencia);
        const comRh = g.pessoas.filter((p) => p.rh).length;
        const pendentesRh = g.pessoas.filter((p) => p.gerente && !p.rh).length;
        return (
          <li
            key={g.data_referencia}
            className="rounded-xl border border-cafeteria-200 bg-white overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(g.data_referencia)}
              className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-cream-50/80"
            >
              <div>
                <p className="font-semibold text-cafeteria-900">
                  Semana {formatarSemanaCurta(g.data_referencia)}
                </p>
                <p className="text-xs text-cafeteria-500 mt-0.5">{g.data_referencia}</p>
              </div>
              <div className="text-right text-xs text-cafeteria-600">
                <p>{g.pessoas.length} pessoa{g.pessoas.length === 1 ? '' : 's'}</p>
                <p>
                  RH {comRh}
                  {pendentesRh > 0 && (
                    <span className="text-amber-700"> · {pendentesRh} pendente{pendentesRh === 1 ? '' : 's'}</span>
                  )}
                </p>
              </div>
            </button>
            {aberto && (
              <div className="border-t border-cafeteria-100 px-4 py-3 bg-cream-50/40 space-y-3">
                {g.pessoas.map((p) => (
                  <div
                    key={p.nome}
                    className="border-b border-cafeteria-100/80 pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-cafeteria-900">
                      {p.nome}
                      <span className="font-normal text-cafeteria-500 text-xs ml-1">
                        · {p.setor} · {p.filial}
                      </span>
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <LinhaTipoAvaliacao tipo="gerente" linha={p.gerente} />
                      <LinhaTipoAvaliacao tipo="rh" linha={p.rh} pendente={!!p.gerente && !p.rh} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LinhaTipoAvaliacao({
  tipo,
  linha,
  pendente,
}: {
  tipo: 'gerente' | 'rh';
  linha?: LinhaDiariaRelatorio;
  pendente?: boolean;
}) {
  const isRh = tipo === 'rh';
  const titulo = isRh ? 'Visita RH' : 'Gerente';

  if (!linha && pendente) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-sm">
        <p className="font-medium text-amber-900">{titulo}</p>
        <p className="text-xs text-amber-800 mt-0.5">Pendente</p>
      </div>
    );
  }

  if (!linha) {
    return (
      <div className="rounded-lg border border-cafeteria-100 bg-white/60 px-3 py-2 text-sm text-cafeteria-400">
        <p className="font-medium">{titulo}</p>
        <p className="text-xs mt-0.5">—</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        isRh ? 'border-sky-200 bg-sky-50/50' : 'border-dourado-200/60 bg-cream-50/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-medium ${isRh ? 'text-sky-900' : 'text-dourado-900'}`}>
            {titulo}
            {!isRh && linha.avaliador_nome && (
              <span className="font-normal text-cafeteria-600 text-xs ml-1">
                ({linha.avaliador_nome})
              </span>
            )}
          </p>
          <DetalheAvaliacaoLinha l={linha} />
        </div>
        <MediaBadge media={linha.media_dia} />
      </div>
    </div>
  );
}
