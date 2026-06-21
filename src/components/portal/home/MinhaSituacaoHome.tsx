'use client';

import type { PortalHomeSituacao } from '@/lib/portal-home-types';

const ESTILO: Record<
  PortalHomeSituacao['nivel'],
  { emoji: string; bg: string; border: string; text: string; chip: string; btn: string }
> = {
  ok: {
    emoji: '✓',
    bg: 'bg-gradient-to-br from-emerald-50 via-white to-portal-actionLight/50',
    border: 'border-emerald-300/70',
    text: 'text-emerald-900',
    chip: 'bg-emerald-500 text-white',
    btn: 'text-emerald-700 hover:bg-emerald-100/70',
  },
  atencao: {
    emoji: '!',
    bg: 'bg-gradient-to-br from-mel-50 via-white to-amber-50/60',
    border: 'border-mel-300',
    text: 'text-mel-700',
    chip: 'bg-mel-400 text-coffee-base',
    btn: 'text-mel-600 hover:bg-mel-100/70',
  },
  urgente: {
    emoji: '!',
    bg: 'bg-gradient-to-br from-terracota-50 via-white to-red-50/60',
    border: 'border-terracota-300',
    text: 'text-terracota-700',
    chip: 'bg-terracota-500 text-white',
    btn: 'text-terracota-600 hover:bg-terracota-100/70',
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
      className={`rounded-2xl border px-4 py-4 ${est.bg} ${est.border} shadow-sm`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold ${est.chip}`}
          >
            {est.emoji}
          </span>
          <p className={`text-base font-semibold leading-snug ${est.text}`}>{situacao.mensagem}</p>
        </div>
        {situacao.nivel !== 'ok' && onVerPendencias ? (
          <button
            type="button"
            onClick={onVerPendencias}
            className={`shrink-0 rounded-lg px-3 text-sm font-semibold min-h-[44px] transition-colors ${est.btn}`}
          >
            Ver →
          </button>
        ) : null}
      </div>
    </section>
  );
}
