'use client';

import Link from 'next/link';
import { EvolucaoBadge } from '@/components/admin/EvolucaoBadge';
import { AdminSection } from '@/components/admin/shell/AdminSection';
import { formatarDelta, formatarNota } from '@/lib/evolucao';
import type { ResumoExecutivoEvolucao } from '@/lib/evolucao-agregacao';

type Props = {
  executivo: ResumoExecutivoEvolucao;
  onIrSetores: () => void;
  onIrUnidades: () => void;
  onIrLideranca: () => void;
};

export function EvolucaoPainelExecutivo({ executivo, onIrSetores, onIrUnidades, onIrLideranca }: Props) {
  const temAlerta =
    executivo.unidades_atencao.length > 0 ||
    executivo.setores_atencao.length > 0 ||
    executivo.colaboradores_atencao.length > 0;

  return (
    <AdminSection
      title="Síntese executiva"
      description="Leitura rápida para sócios e gestão — onde olhar primeiro"
    >
      <div className="grid lg:grid-cols-3 gap-4">
        <div
          className={`rounded-2xl border p-4 ${
            temAlerta
              ? 'border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-red-50/40'
              : 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-cream-50'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee-base/80 mb-2">
            {temAlerta ? 'Precisa atenção' : 'Rede estável'}
          </p>
          {executivo.unidades_atencao.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {executivo.unidades_atencao.map((u) => (
                <li key={u.slug} className="flex justify-between gap-2">
                  <span className="font-medium text-coffee-base">{u.nome}</span>
                  <span className="text-red-800 tabular-nums shrink-0">
                    🔴 {u.regredindo} · média {formatarNota(u.media_atual)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-900">Nenhuma unidade com queda relevante no período.</p>
          )}
          {executivo.setores_atencao.length > 0 && (
            <div className="mt-3 pt-3 border-t border-cafeteria-100">
              <p className="text-xs text-cafeteria-600 mb-1">Setores</p>
              <div className="flex flex-wrap gap-1.5">
                {executivo.setores_atencao.map((s) => (
                  <button
                    key={s.setor}
                    type="button"
                    onClick={onIrSetores}
                    className="text-xs rounded-full bg-white border border-amber-200 px-2 py-0.5 hover:border-dourado-300"
                  >
                    {s.setor} ({s.regredindo})
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onIrUnidades}
            className="mt-3 text-xs font-medium text-dourado-base hover:underline"
          >
            Ver unidades →
          </button>
        </div>

        <div className="rounded-2xl border border-cafeteria-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cafeteria-600 mb-2">Destaques</p>
          {executivo.unidade_em_evolucao && (
            <p className="text-sm text-coffee-base mb-2">
              <span className="text-emerald-700 font-medium">Unidade em alta:</span>{' '}
              {executivo.unidade_em_evolucao.nome} ({executivo.unidade_em_evolucao.evoluindo} evoluindo)
            </p>
          )}
          {executivo.top_evolucao && (
            <p className="text-sm text-coffee-base mb-2">
              <span className="text-emerald-700 font-medium">Maior evolução individual:</span>{' '}
              {executivo.top_evolucao.nome}{' '}
              <span className="tabular-nums">{formatarDelta(executivo.top_evolucao.delta)}</span>
            </p>
          )}
          {!executivo.unidade_em_evolucao && !executivo.top_evolucao && (
            <p className="text-sm text-cafeteria-600">Ainda pouco histórico para destaques.</p>
          )}
          <button
            type="button"
            onClick={onIrLideranca}
            className="mt-2 text-xs font-medium text-dourado-base hover:underline"
          >
            Ver liderança (ILI) →
          </button>
        </div>

        <div className="rounded-2xl border border-cafeteria-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cafeteria-600 mb-2">
            Colaboradores em queda
          </p>
          {executivo.colaboradores_atencao.length === 0 ? (
            <p className="text-sm text-emerald-800">Ninguém na faixa de atenção agora.</p>
          ) : (
            <ul className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
              {executivo.colaboradores_atencao.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-coffee-base">{c.nome}</span>
                  <EvolucaoBadge situacao="regredindo" compacto delta={c.delta} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/avaliacoes-diarias"
            className="inline-block mt-3 text-xs font-medium text-dourado-base hover:underline"
          >
            Avaliações semanais →
          </Link>
        </div>
      </div>
    </AdminSection>
  );
}
