'use client';

import Link from 'next/link';
import { AvaliacoesPendentesPainel } from '@/components/admin/AvaliacoesPendentesPainel';

export default function AdminPendenciasSemanaPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold text-coffee-base">Pendências da semana</h1>
          <p className="text-sm text-coffee-100 mt-1">
            Semana passada (avaliada nesta semana) — quem ainda não enviou nota de líder ou Visita RH.
          </p>
        </div>
        <Link href="/admin/lideres-por-setor" className="text-sm font-medium text-dourado-500 hover:underline">
          Mapa de liderança →
        </Link>
      </div>

      <AvaliacoesPendentesPainel apiBase="/api/admin/avaliacoes-pendentes" autoRefresh />
    </div>
  );
}
