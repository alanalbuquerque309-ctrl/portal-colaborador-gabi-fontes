'use client';

import { ReconhecimentoSemanal } from '@/components/mural/ReconhecimentoSemanal';

/** Reconhecimento semanal na home (notas e troféus da semana corrente). */
export function DestaqueSection() {
  return (
    <section className="rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 to-cream-100 p-6 shadow-lg overflow-hidden">
      <h2 className="text-lg font-display font-semibold text-cafeteria-900 mb-1">Destaques da semana</h2>
      <p className="text-sm text-cafeteria-600 mb-4 leading-relaxed">
        Top 3 da rede para todos. Use os botões para ver por unidade ou troféus. O acumulado do mês está no mural.
      </p>
      <ReconhecimentoSemanal compacto />
    </section>
  );
}
