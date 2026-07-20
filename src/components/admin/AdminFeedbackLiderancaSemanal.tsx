'use client';

import { useMemo } from 'react';
import {
  RelatorioLiderancaPorLider,
  type LinhaLiderRelatorio,
} from '@/components/portal/RelatorioAvaliacoesPorSetor';
import { MediaBadgeLider } from '@/components/portal/RelatorioLiderancaDetalhe';
import {
  PILARES_LIDERANCA,
  classeMedia,
  filtrarLinhasLideranca,
  linhaTemNotaBaixa,
  mediasPilaresGrupo,
} from '@/lib/lideranca-relatorio-ui';
import { rotuloSemanaSaoPaulo, segundaSemanaSaoPaulo } from '@/lib/semana-brasil';

function mediaGeralGrupo(regs: LinhaLiderRelatorio[]): number {
  if (regs.length === 0) return 0;
  return Math.round((regs.reduce((s, r) => s + r.media, 0) / regs.length) * 100) / 100;
}

function contarLideres(regs: LinhaLiderRelatorio[]): number {
  return new Set(regs.map((r) => String(r.avaliado_nome ?? '').trim()).filter(Boolean)).size;
}

function agruparPorSemana(linhas: LinhaLiderRelatorio[]): Array<[string, LinhaLiderRelatorio[]]> {
  const map = new Map<string, LinhaLiderRelatorio[]>();
  for (const l of linhas) {
    const k = String(l.semana_inicio ?? '').trim();
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(l);
    map.set(k, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

function labelMesCorrente(): string {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function ChevronIcon({ aberto }: { aberto?: boolean }) {
  return (
    <svg
      className={`w-5 h-5 shrink-0 text-dourado-base transition-transform ${aberto ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function AdminFeedbackLiderancaSemanal({
  linhas,
  busca = '',
  somenteNotaBaixa = false,
}: {
  linhas: LinhaLiderRelatorio[];
  busca?: string;
  somenteNotaBaixa?: boolean;
}) {
  const semanaAtual = segundaSemanaSaoPaulo();

  const filtradas = useMemo(
    () => filtrarLinhasLideranca(linhas, busca, somenteNotaBaixa),
    [linhas, busca, somenteNotaBaixa]
  );

  const linhasSemanaAtual = useMemo(
    () => filtradas.filter((l) => l.semana_inicio === semanaAtual),
    [filtradas, semanaAtual]
  );

  const semanasAnteriores = useMemo(
    () => agruparPorSemana(filtradas).filter(([semana]) => semana !== semanaAtual),
    [filtradas, semanaAtual]
  );

  const mediaSemana = mediaGeralGrupo(linhasSemanaAtual);
  const mediaMes = mediaGeralGrupo(filtradas);
  const mediasMesPilares = mediasPilaresGrupo(filtradas);
  const qtdBaixasSemana = linhasSemanaAtual.filter(linhaTemNotaBaixa).length;

  if (filtradas.length === 0) {
    return (
      <p className="text-sm text-cafeteria-500 py-8 text-center rounded-xl border border-cafeteria-200 bg-white">
        Nenhum registro no período com estes filtros.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Esta semana — destaque */}
      <section className="rounded-xl border-2 border-dourado-base bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-dourado-50 to-amber-50 px-4 py-4 border-b border-dourado-200">
          <p className="text-xs font-medium uppercase tracking-wide text-dourado-700">Prioridade</p>
          <h2 className="font-display text-xl font-semibold text-cafeteria-900 mt-0.5">Esta semana</h2>
          <p className="text-sm text-cafeteria-600 mt-1">{rotuloSemanaSaoPaulo(semanaAtual)}</p>

          {linhasSemanaAtual.length === 0 ? (
            <p className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-3 leading-relaxed">
              Nenhuma avaliação esta semana ainda. A equipe e o RH podem avaliar até domingo.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <MediaBadgeLider media={mediaSemana} />
              <div className="text-sm text-cafeteria-800 leading-relaxed">
                <strong>{linhasSemanaAtual.length}</strong> avaliação
                {linhasSemanaAtual.length === 1 ? '' : 'ões'}
                {' · '}
                <strong>{contarLideres(linhasSemanaAtual)}</strong> líder
                {contarLideres(linhasSemanaAtual) === 1 ? '' : 'es'} avaliado
                {contarLideres(linhasSemanaAtual) === 1 ? '' : 's'}
                {qtdBaixasSemana > 0 ? (
                  <span className="text-amber-900 font-medium">
                    {' '}
                    · {qtdBaixasSemana} com nota ≤3
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {linhasSemanaAtual.length > 0 && (
          <div className="px-3 py-4 sm:px-4">
            <RelatorioLiderancaPorLider
              linhas={linhasSemanaAtual}
              busca=""
              somenteNotaBaixa={false}
              ordenarPioresPrimeiro
            />
          </div>
        )}
      </section>

      {/* Média do mês — compacto */}
      <details className="group rounded-xl border border-cafeteria-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 hover:bg-cream-50/80 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-cafeteria-900 capitalize">Média do mês · {labelMesCorrente()}</p>
            <p className="text-xs sm:text-sm text-cafeteria-600 mt-0.5">
              {filtradas.length} avaliação{filtradas.length === 1 ? '' : 'ões'} · {contarLideres(filtradas)} líder
              {contarLideres(filtradas) === 1 ? '' : 'es'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MediaBadgeLider media={mediaMes} />
            <ChevronIcon />
          </div>
        </summary>
        <div className="border-t border-cafeteria-100 px-4 py-3 bg-cream-50/40">
          <p className="text-xs text-cafeteria-600 mb-3">Média por pilar no período filtrado (inclui todas as semanas).</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PILARES_LIDERANCA.map((p) => {
              const nota = mediasMesPilares[p.key];
              return (
                <div key={p.key} className={`rounded-lg border px-2 py-2 text-center text-xs ${classeMedia(nota)}`}>
                  <p className="leading-snug">{p.short}</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">{nota.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      {/* Semanas anteriores */}
      {semanasAnteriores.length > 0 && (
        <section className="rounded-xl border border-cafeteria-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-cafeteria-100 bg-cafeteria-50/50">
            <h3 className="font-display text-base font-semibold text-cafeteria-900">Semanas anteriores</h3>
            <p className="text-xs sm:text-sm text-cafeteria-600 mt-0.5">
              Toque em uma semana para ver todas as notas. Histórico do período selecionado nos filtros.
            </p>
          </div>
          <ul className="divide-y divide-cafeteria-100 list-none p-0 m-0">
            {semanasAnteriores.map(([semana, regs]) => {
              const media = mediaGeralGrupo(regs);
              const qtdBaixas = regs.filter(linhaTemNotaBaixa).length;
              return (
                <li key={semana}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 hover:bg-cream-50/80 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-cafeteria-900">{rotuloSemanaSaoPaulo(semana)}</p>
                        <p className="text-xs text-cafeteria-600 mt-0.5">
                          {regs.length} avaliação{regs.length === 1 ? '' : 'ões'} · {contarLideres(regs)} líder
                          {contarLideres(regs) === 1 ? '' : 'es'}
                          {qtdBaixas > 0 ? (
                            <span className="text-amber-800 font-medium"> · {qtdBaixas} nota ≤3</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <MediaBadgeLider media={media} />
                        <ChevronIcon />
                      </div>
                    </summary>
                    <div className="border-t border-cafeteria-100 px-3 py-4 sm:px-4 bg-cream-50/30">
                      <RelatorioLiderancaPorLider
                        linhas={regs}
                        busca=""
                        somenteNotaBaixa={false}
                        ordenarPioresPrimeiro
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
