'use client';

import { useState } from 'react';
import { DestaquesHome } from '@/components/destaque/DestaquesHome';

/** Resumo na home: ranking semanal (top 3) + mensal compacto. */
export function DestaqueSection() {
  const [aba, setAba] = useState<'semanal' | 'mensal'>('semanal');

  return (
    <section className="rounded-2xl border-2 border-dourado-base/60 bg-gradient-to-br from-dourado-50/80 via-cream-50 to-white p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-cafeteria-900">Reconhecimentos</h2>
          <p className="text-sm text-cafeteria-600 mt-0.5 leading-relaxed">
            Avaliação e troféus — top 3 por unidade, semanal ou mensal.
          </p>
        </div>
        <div
          className="inline-flex rounded-xl border border-dourado-base/40 bg-white p-1 self-start sm:self-auto"
          role="tablist"
          aria-label="Período dos destaques"
        >
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'semanal'}
            onClick={() => setAba('semanal')}
            className={`rounded-lg px-4 py-2 text-sm font-medium min-h-[40px] transition-colors ${
              aba === 'semanal'
                ? 'bg-portal-action text-white shadow-sm'
                : 'text-cafeteria-700 hover:bg-cream-50'
            }`}
          >
            Semanal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'mensal'}
            onClick={() => setAba('mensal')}
            className={`rounded-lg px-4 py-2 text-sm font-medium min-h-[40px] transition-colors ${
              aba === 'mensal'
                ? 'bg-dourado-base text-coffee-base shadow-sm'
                : 'text-cafeteria-700 hover:bg-cream-50'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>
      <DestaquesHome aba={aba} />
    </section>
  );
}
