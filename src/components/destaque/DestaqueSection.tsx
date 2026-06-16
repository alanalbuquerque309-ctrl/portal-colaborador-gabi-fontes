'use client';

import { DestaquesHome } from '@/components/destaque/DestaquesHome';

/** Resumo na home: ranking semanal (top 3) + mensal compacto. */
export function DestaqueSection() {
  return (
    <section className="rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 to-cream-100 p-6 shadow-lg overflow-hidden">
      <h2 className="text-lg font-display font-semibold text-cafeteria-900 mb-1">Destaques</h2>
      <p className="text-sm text-cafeteria-600 mb-4 leading-relaxed">
        <strong>Semanal:</strong> top 3 de avaliações da semana. <strong>Mensal:</strong> acumulado do mês (geral
        sempre visível; unidade e troféus só se você abrir).
      </p>
      <DestaquesHome />
    </section>
  );
}
