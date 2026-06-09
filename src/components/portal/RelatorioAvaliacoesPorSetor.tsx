'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { agruparPorSetorEColaborador } from '@/lib/relatorio-avaliacoes-agrupar';
import {
  filtrarLinhasLideranca,
  linhaTemNotaBaixa,
  mediasPilaresGrupo,
  pilarMaisFracoGrupo,
  classeMedia,
  PILARES_LIDERANCA,
} from '@/lib/lideranca-relatorio-ui';
import { CardAvaliacaoLideranca, MediaBadgeLider } from '@/components/portal/RelatorioLiderancaDetalhe';

export type LinhaDiariaRelatorio = {
  id: string;
  data_referencia: string;
  assiduidade: string;
  nota_vestimenta: number | null;
  nota_pontualidade: number | null;
  nota_trabalho_equipe: number | null;
  nota_desempenho_tarefas: number | null;
  nota_proatividade?: number | null;
  media_dia: number | null;
  justificativa_nota_baixa: string | null;
  colaborador_nome: string | null;
  colaborador_setor?: string | null;
  colaborador_unidade_nome?: string | null;
  colaborador_unidade_slug?: string | null;
  avaliador_nome: string | null;
  avaliador_rotulo?: string | null;
  origem_visita_rh?: boolean;
};

export type LinhaLiderRelatorio = {
  id: string;
  semana_inicio: string;
  avaliado_nome: string;
  avaliado_setor?: string | null;
  filial_nome?: string;
  avaliador_label: string;
  n_exemplo: number;
  n_comunicacao: number;
  n_suporte: number;
  n_justica: number;
  n_clima: number;
  justificativa_nota_baixa: string | null;
  media: number;
};

function TabelaDiariasColaborador({ linhas }: { linhas: LinhaDiariaRelatorio[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cafeteria-100 bg-cream-50/50">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-cafeteria-50 text-cafeteria-800 text-xs">
          <tr>
            <th className="px-2 py-2">Semana (seg.)</th>
            <th className="px-2 py-2">Avaliador</th>
            <th className="px-2 py-2">Assiduidade</th>
            <th className="px-2 py-2 text-center">Vestim.</th>
            <th className="px-2 py-2 text-center">Pontual.</th>
            <th className="px-2 py-2 text-center">Trabalho eq.</th>
            <th className="px-2 py-2 text-center">Desempenho</th>
            <th className="px-2 py-2 text-center">Proativ.</th>
            <th className="px-2 py-2">Média</th>
            <th className="px-2 py-2">Justificativa</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-t border-cafeteria-100">
              <td className="px-2 py-2 whitespace-nowrap">{l.data_referencia}</td>
              <td className="px-2 py-2">
                {l.avaliador_rotulo ?? l.avaliador_nome ?? '—'}
                {l.origem_visita_rh && (
                  <span className="ml-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                    RH
                  </span>
                )}
              </td>
              <td className="px-2 py-2 text-cafeteria-600">{l.assiduidade}</td>
              <td className="px-2 py-2 text-center">{l.nota_vestimenta ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_pontualidade ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_trabalho_equipe ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_desempenho_tarefas ?? '—'}</td>
              <td className="px-2 py-2 text-center">{l.nota_proatividade ?? '—'}</td>
              <td className="px-2 py-2">{l.media_dia != null ? Number(l.media_dia).toFixed(2) : '—'}</td>
              <td className="px-2 py-2 text-cafeteria-600 max-w-xs whitespace-pre-wrap break-words align-top">{l.justificativa_nota_baixa || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaLiderancaColaborador({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {linhas.map((row) => (
        <CardAvaliacaoLideranca key={row.id} row={row} />
      ))}
    </div>
  );
}

function TabelaLiderancaDesktop({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  return (
    <div className="hidden md:block overflow-x-auto rounded-lg border border-cafeteria-100 bg-cream-50/50">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-cafeteria-50 text-cafeteria-800 text-xs">
          <tr>
            <th className="px-2 py-2">Semana</th>
            <th className="px-2 py-2">Quem avaliou</th>
            <th className="px-2 py-2 text-center">Média</th>
            {PILARES_LIDERANCA.map((p) => (
              <th key={p.key} className="px-2 py-2 text-center">
                {p.short}
              </th>
            ))}
            <th className="px-2 py-2">Justificativa</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((row) => (
            <tr
              key={row.id}
              className={`border-t border-cafeteria-100 ${linhaTemNotaBaixa(row) ? 'bg-amber-50/60' : ''}`}
            >
              <td className="px-2 py-2 whitespace-nowrap">{row.semana_inicio}</td>
              <td className="px-2 py-2 text-cafeteria-600 max-w-[140px] break-words">{row.avaliador_label}</td>
              <td className="px-2 py-2 text-center font-medium">{row.media.toFixed(2)}</td>
              {PILARES_LIDERANCA.map((p) => (
                <td key={p.key} className="px-2 py-2 text-center font-medium">
                  {row[p.key]}
                </td>
              ))}
              <td className="px-2 py-2 text-cafeteria-600 max-w-xs whitespace-pre-wrap break-words align-top">
                {row.justificativa_nota_baixa || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaAvaliacoesLider({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  return (
    <>
      <TabelaLiderancaColaborador linhas={linhas} />
      <TabelaLiderancaDesktop linhas={linhas} />
    </>
  );
}

function BlocoSetorColaboradores<T>({
  grupos,
  vazio,
  renderColaborador,
}: {
  grupos: ReturnType<typeof agruparPorSetorEColaborador<T>>;
  vazio: string;
  renderColaborador: (nome: string, linhas: T[]) => ReactNode;
}) {
  if (grupos.length === 0) {
    return <p className="text-sm text-cafeteria-500 py-4 text-center">{vazio}</p>;
  }

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.setor} className="rounded-lg border border-cafeteria-200 bg-cream-50/30 p-4">
          <h4 className="text-base font-semibold text-cafeteria-900 border-b border-dourado-200/60 pb-2 mb-4">
            {g.setor}
          </h4>
          {g.colaboradores.length === 0 ? (
            <p className="text-sm text-cafeteria-500">Nenhum colaborador neste setor no período.</p>
          ) : (
            <ul className="space-y-5">
              {g.colaboradores.map((c) => (
                <li key={`${g.setor}-${c.nome}`}>
                  <p className="text-sm font-medium text-dourado-800 mb-2 pl-1">{c.nome}</p>
                  {renderColaborador(c.nome, c.linhas)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function RelatorioDiariasPorSetor({ linhas }: { linhas: LinhaDiariaRelatorio[] }) {
  const grupos = agruparPorSetorEColaborador(
    linhas,
    (l) => l.colaborador_setor,
    (l) => l.colaborador_nome
  );

  return (
    <BlocoSetorColaboradores
      grupos={grupos}
      vazio="Nenhum registro no período."
      renderColaborador={(_nome, regs) => (
        <TabelaDiariasColaborador linhas={regs as LinhaDiariaRelatorio[]} />
      )}
    />
  );
}

export function RelatorioLiderancaPorSetor({ linhas }: { linhas: LinhaLiderRelatorio[] }) {
  const grupos = agruparPorSetorEColaborador(
    linhas,
    (l) => l.avaliado_setor,
    (l) => l.avaliado_nome
  );

  return (
    <BlocoSetorColaboradores
      grupos={grupos}
      vazio="Nenhum registro no período."
      renderColaborador={(_nome, regs) => (
        <ListaAvaliacoesLider linhas={regs as LinhaLiderRelatorio[]} />
      )}
    />
  );
}

/** Agrupa pelo líder avaliado (nome), com setor e filial no cabeçalho. */
export function RelatorioLiderancaPorLider({
  linhas,
  busca = '',
  somenteNotaBaixa = false,
  ordenarPioresPrimeiro = true,
}: {
  linhas: LinhaLiderRelatorio[];
  busca?: string;
  somenteNotaBaixa?: boolean;
  ordenarPioresPrimeiro?: boolean;
}) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const filtradas = useMemo(
    () => filtrarLinhasLideranca(linhas, busca, somenteNotaBaixa),
    [linhas, busca, somenteNotaBaixa]
  );

  const lideres = useMemo(() => {
    const porLider = new Map<string, LinhaLiderRelatorio[]>();
    for (const l of filtradas) {
      const nome = String(l.avaliado_nome ?? '').trim() || '—';
      if (!porLider.has(nome)) porLider.set(nome, []);
      porLider.get(nome)!.push(l);
    }

    const entries = Array.from(porLider.entries()).map(([nome, regs]) => {
      const mediaGeral = regs.reduce((s, r) => s + r.media, 0) / Math.max(1, regs.length);
      const qtdBaixas = regs.filter(linhaTemNotaBaixa).length;
      const fraco = pilarMaisFracoGrupo(regs);
      return { nome, regs, mediaGeral, qtdBaixas, fraco };
    });

    entries.sort((a, b) => {
      if (ordenarPioresPrimeiro) {
        if (a.mediaGeral !== b.mediaGeral) return a.mediaGeral - b.mediaGeral;
        if (a.qtdBaixas !== b.qtdBaixas) return b.qtdBaixas - a.qtdBaixas;
      }
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    return entries;
  }, [filtradas, ordenarPioresPrimeiro]);

  const toggle = (nome: string) => {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  if (filtradas.length === 0) {
    return (
      <p className="text-sm text-cafeteria-500 py-8 text-center">
        Nenhum registro no período com estes filtros.
      </p>
    );
  }

  return (
    <ul className="space-y-2 list-none p-0 m-0">
      {lideres.map(({ nome, regs, mediaGeral, qtdBaixas, fraco }) => {
        const setor = regs[0]?.avaliado_setor?.trim() || 'Sem setor definido';
        const filiais = Array.from(
          new Set(regs.map((r) => r.filial_nome?.trim()).filter(Boolean) as string[])
        );
        const aberto = abertos.has(nome);
        const mediasP = mediasPilaresGrupo(regs);
        const precisaAtencao = mediaGeral <= 3.5 || qtdBaixas > 0;

        return (
          <li
            key={nome}
            className={`rounded-xl border overflow-hidden shadow-sm ${
              precisaAtencao ? 'border-amber-300 bg-amber-50/20' : 'border-cafeteria-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(nome)}
              className="w-full text-left px-4 py-3.5 flex flex-wrap items-start justify-between gap-3 hover:bg-cream-50/80 min-h-[44px]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base text-cafeteria-900 leading-snug break-words">{nome}</p>
                <p className="text-xs sm:text-sm text-cafeteria-600 mt-1 leading-relaxed">
                  {setor}
                  {filiais.length > 0 ? ` · ${filiais.join(', ')}` : ''}
                </p>
                <p className="text-xs text-cafeteria-500 mt-1">
                  {regs.length} avaliação{regs.length === 1 ? '' : 'ões'}
                  {qtdBaixas > 0 ? (
                    <span className="text-amber-800 font-medium">
                      {' '}
                      · {qtdBaixas} com nota ≤3
                    </span>
                  ) : null}
                </p>
                {fraco && precisaAtencao && (
                  <p className="text-xs font-medium text-amber-900 mt-1.5">
                    Melhorar: {fraco.label} (média {fraco.nota.toFixed(2)} no período)
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <MediaBadgeLider media={mediaGeral} />
                <span className="text-xs text-cafeteria-500">{aberto ? 'Fechar ▲' : 'Ver detalhes ▼'}</span>
              </div>
            </button>

            {aberto && (
              <div className="border-t border-cafeteria-100 px-4 py-3 bg-cream-50/40 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PILARES_LIDERANCA.map((p) => {
                    const nota = mediasP[p.key];
                    return (
                      <div
                        key={p.key}
                        className={`rounded-lg border px-2 py-2 text-center text-xs ${classeMedia(nota)}`}
                      >
                        <p className="leading-snug">{p.short}</p>
                        <p className="text-base font-bold tabular-nums mt-0.5">{nota.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
                <ListaAvaliacoesLider
                  linhas={[...regs].sort((a, b) => b.semana_inicio.localeCompare(a.semana_inicio))}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
