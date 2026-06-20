'use client';

import type { ReactNode } from 'react';

export type PainelStatTom = 'dourado' | 'verde' | 'ambar' | 'neutro';

const TOM_BORDA: Record<PainelStatTom, string> = {
  dourado: 'border-l-dourado-base bg-gradient-to-br from-amber-50/80 via-white to-cream-50',
  verde: 'border-l-portal-action bg-gradient-to-br from-portal-actionLight/50 via-white to-emerald-50/30',
  ambar: 'border-l-amber-500 bg-gradient-to-br from-amber-50/70 via-white to-cream-50',
  neutro: 'border-l-cafeteria-400 bg-white/95',
};

type Props = {
  emoji: string;
  label: string;
  valor: string;
  sub?: string | null;
  tom?: PainelStatTom;
  aberto?: boolean;
  onToggle?: () => void;
  gaveta?: ReactNode;
  href?: string;
};

export function PainelStatCard({
  emoji,
  label,
  valor,
  sub,
  tom = 'neutro',
  aberto,
  onToggle,
  gaveta,
  href,
}: Props) {
  const interativo = !!onToggle || !!href;
  const conteudo = (
    <>
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none shrink-0" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-cafeteria-600 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold tabular-nums text-cafeteria-900 mt-0.5 leading-tight">{valor}</p>
          {sub ? <p className="text-xs text-cafeteria-600 mt-1 leading-snug">{sub}</p> : null}
        </div>
        {onToggle && (
          <span
            className={`text-cafeteria-500 text-sm shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▼
          </span>
        )}
      </div>
      {aberto && gaveta ? (
        <div className="mt-3 pt-3 border-t border-cafeteria-200/80 text-sm">{gaveta}</div>
      ) : null}
    </>
  );

  const cls = `rounded-xl border border-cafeteria-200/80 border-l-4 shadow-sm p-3.5 ${TOM_BORDA[tom]} ${
    interativo ? 'cursor-pointer hover:shadow-md transition-shadow min-h-[44px]' : ''
  }`;

  if (href && !onToggle) {
    return (
      <a href={href} className={`block ${cls}`}>
        {conteudo}
      </a>
    );
  }

  return (
    <div
      className={cls}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      onClick={onToggle}
      onKeyDown={
        onToggle
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
    >
      {conteudo}
    </div>
  );
}
