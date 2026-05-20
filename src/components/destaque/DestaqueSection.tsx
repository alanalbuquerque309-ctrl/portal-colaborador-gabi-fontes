'use client';

import { MuralReconhecimento } from '@/components/mural/MuralReconhecimento';

/** Destaques automáticos (semana + mês) na home. */
export function DestaqueSection() {
  return (
    <section className="rounded-2xl border-2 border-dourado-base bg-gradient-to-br from-dourado-50 to-cream-100 p-6 shadow-lg overflow-hidden">
      <h2 className="text-lg font-display font-semibold text-cafeteria-900 mb-4">Reconhecimento</h2>
      <MuralReconhecimento compacto />
    </section>
  );
}
