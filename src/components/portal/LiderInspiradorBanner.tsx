'use client';

import { useEffect, useState } from 'react';
import type { LiderInspiradorVencedor } from '@/lib/portal-home-types';
import type { PeriodoLiderDestaque } from '@/lib/lider-inspirador';

type Props = {
  embedded?: boolean;
  periodo?: PeriodoLiderDestaque;
};

function formatarNotaIli(ili: number): string {
  return ili.toFixed(1).replace('.', ',');
}

export function LiderInspiradorBanner({ embedded = false, periodo = 'semanal' }: Props) {
  const [vencedor, setVencedor] = useState<LiderInspiradorVencedor | null>(null);
  const [periodoRotulo, setPeriodoRotulo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/portal/lider-inspirador?periodo=${periodo}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then(
        (d: {
          ok?: boolean;
          vencedor?: LiderInspiradorVencedor | null;
          periodo_rotulo?: string;
          semana_rotulo?: string;
        }) => {
          if (cancel) return;
          if (d.ok && d.vencedor) {
            setVencedor(d.vencedor);
            setPeriodoRotulo(d.periodo_rotulo ?? d.semana_rotulo ?? d.vencedor.semana_rotulo ?? '');
          } else {
            setVencedor(null);
          }
        }
      )
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [periodo]);

  if (loading) {
    return (
      <div
        className={
          embedded
            ? 'rounded-xl border border-emerald-200/60 bg-white/80 h-24 mb-4 animate-pulse'
            : 'rounded-2xl border border-emerald-200/60 bg-white/80 h-28 mb-4 animate-pulse'
        }
        aria-hidden
      />
    );
  }

  if (!vencedor) return null;

  const rotuloPeriodo =
    periodo === 'semanal'
      ? `Semana ${periodoRotulo || vencedor.semana_rotulo}`
      : periodo === 'mensal'
        ? `Mês ${periodoRotulo}`
        : `Ano ${periodoRotulo}`;

  return (
    <section
      aria-labelledby="lider-inspirador-titulo"
      className={
        embedded
          ? 'rounded-xl border border-emerald-200/80 bg-white/95 p-4 sm:p-5 mb-4 shadow-sm'
          : 'rounded-2xl border-2 border-emerald-300/70 bg-gradient-to-br from-emerald-50 via-white to-dourado-50/40 p-5 sm:p-6 shadow-md'
      }
    >
      <p id="lider-inspirador-titulo" className="text-xs font-bold uppercase tracking-wider text-emerald-800">
        Líder destaque
      </p>
      <p className="text-sm text-cafeteria-600 mt-1">{rotuloPeriodo}</p>
      <h2 className="text-xl font-display font-semibold text-cafeteria-900 mt-2">{vencedor.nome}</h2>
      <p className="text-sm text-cafeteria-700 mt-0.5">
        Gerente · {vencedor.unidade_nome}
        {vencedor.setor ? ` · ${vencedor.setor}` : ''}
      </p>
      <p className="text-base font-semibold text-emerald-800 mt-2">Nota ILI {formatarNotaIli(vencedor.ili)}</p>
    </section>
  );
}
