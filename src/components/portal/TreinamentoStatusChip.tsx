'use client';

import { labelStatusTreino, statusTreino, type TreinamentoPortalItem } from '@/lib/treinamento-portal-ux';

const ESTILOS = {
  concluido: 'bg-emerald-100 text-emerald-800',
  visualizado: 'bg-sky-100 text-sky-800',
  pendente: 'bg-amber-100 text-amber-900',
  nao_fez: 'bg-red-100 text-red-800',
} as const;

export function TreinamentoStatusChip({ item, grande }: { item: TreinamentoPortalItem; grande?: boolean }) {
  const status = statusTreino(item);
  const cls = grande
    ? `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${ESTILOS[status]}`
    : `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILOS[status]}`;

  return (
    <span className={cls}>
      {status === 'concluido' ? `${labelStatusTreino(status)} ✓` : labelStatusTreino(status)}
    </span>
  );
}
