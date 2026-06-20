'use client';

import type { PortalHomeSituacao } from '@/lib/portal-home-types';

const ESTILO: Record<
  PortalHomeSituacao['nivel'],
  { dot: string; bg: string; border: string; text: string }
> = {
  ok: {
    dot: '🟢',
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
  },
  atencao: {
    dot: '🟡',
    bg: 'bg-amber-50/90',
    border: 'border-amber-300',
    text: 'text-amber-950',
  },
  urgente: {
    dot: '🔴',
    bg: 'bg-red-50/90',
    border: 'border-red-300',
    text: 'text-red-950',
  },
};

type Props = {
  situacao: PortalHomeSituacao;
  onVerPendencias?: () => void;
};

export function MinhaSituacaoHome({ situacao, onVerPendencias }: Props) {
  const est = ESTILO[situacao.nivel];

  return (
    <section
      aria-label="Minha situação"
      className={`rounded-2xl border px-4 py-3.5 ${est.bg} ${est.border} shadow-sm`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-base font-semibold ${est.text} flex items-center gap-2`}>
          <span aria-hidden>{est.dot}</span>
          <span>{situacao.mensagem}</span>
        </p>
        {situacao.nivel !== 'ok' && onVerPendencias ? (
          <button
            type="button"
            onClick={onVerPendencias}
            className="text-sm font-medium text-portal-action shrink-0 hover:underline min-h-[44px] px-1"
          >
            Ver →
          </button>
        ) : null}
      </div>
    </section>
  );
}
