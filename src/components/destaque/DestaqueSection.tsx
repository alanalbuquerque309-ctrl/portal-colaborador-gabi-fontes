'use client';

import { useState } from 'react';
import { DestaquesHome, type DestaquePeriodoAba } from '@/components/destaque/DestaquesHome';
import { LiderInspiradorBanner } from '@/components/portal/LiderInspiradorBanner';

/** Resumo na home: líder destaque + rankings por período. */
export function DestaqueSection() {
  const [aba, setAba] = useState<DestaquePeriodoAba>('semanal');

  return (
    <section className="rounded-2xl border-2 border-dourado-base/60 bg-gradient-to-br from-dourado-50/80 via-cream-50 to-white p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-cafeteria-900">Reconhecimentos</h2>
        </div>
        <div
          className="inline-flex flex-wrap rounded-xl border border-dourado-base/40 bg-white p-1 self-start sm:self-auto"
          role="tablist"
          aria-label="Período dos destaques"
        >
          {(
            [
              ['semanal', 'Semanal'],
              ['mensal', 'Mensal'],
              ['acumulado', 'Acumulado'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={`rounded-lg px-3 sm:px-4 py-2 text-sm font-medium min-h-[40px] transition-colors ${
                aba === id
                  ? id === 'semanal'
                    ? 'bg-portal-action text-white shadow-sm'
                    : 'bg-dourado-base text-coffee-base shadow-sm'
                  : 'text-cafeteria-700 hover:bg-cream-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <LiderInspiradorBanner embedded periodo={aba === 'acumulado' ? 'anual' : aba} />
      <DestaquesHome aba={aba} />
    </section>
  );
}
