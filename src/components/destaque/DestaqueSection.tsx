'use client';

import { ReconhecimentoSemanal } from '@/components/mural/ReconhecimentoSemanal';

/** Reconhecimento semanal na home (notas e troféus da semana corrente). */
export function DestaqueSection() {
  return (
    <section className="rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 to-cream-100 p-6 shadow-lg overflow-hidden">
      <h2 className="text-lg font-display font-semibold text-cafeteria-900 mb-1">Reconhecimento semanal</h2>
      <p className="text-xs text-cafeteria-600 mb-4">
        Atualiza a cada semana com as melhores notas e troféus entre pares. Os acumulados do mês estão no mural
        abaixo.
      </p>
      <ReconhecimentoSemanal />
    </section>
  );
}
