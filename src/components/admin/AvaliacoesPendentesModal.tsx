'use client';

import { AvaliacoesPendentesPainel } from '@/components/admin/AvaliacoesPendentesPainel';

type Props = {
  aberto: boolean;
  onFechar: () => void;
  apiBase?: '/api/admin/avaliacoes-pendentes' | '/api/portal/avaliacoes-pendentes';
};

export function AvaliacoesPendentesModal({
  aberto,
  onFechar,
  apiBase = '/api/admin/avaliacoes-pendentes',
}: Props) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onFechar}
      />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b border-cream-200 flex items-start justify-between gap-3 shrink-0">
          <p className="text-sm text-coffee-100">Toque fora ou × para fechar</p>
          <button
            type="button"
            onClick={onFechar}
            className="text-coffee-100 hover:text-coffee-base text-2xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <AvaliacoesPendentesPainel apiBase={apiBase} compacto autoRefresh />
        </div>
      </div>
    </div>
  );
}
