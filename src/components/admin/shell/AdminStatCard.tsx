import Link from 'next/link';
import type { ReactNode } from 'react';

export type AdminStatTom = 'neutro' | 'verde' | 'ambar' | 'vermelho' | 'dourado';

const TOM: Record<AdminStatTom, string> = {
  neutro: 'border-l-cafeteria-400 bg-white',
  verde: 'border-l-emerald-500 bg-gradient-to-br from-emerald-50/60 via-white to-cream-50',
  ambar: 'border-l-amber-500 bg-gradient-to-br from-amber-50/70 via-white to-cream-50',
  vermelho: 'border-l-red-500 bg-gradient-to-br from-red-50/50 via-white to-cream-50',
  dourado: 'border-l-dourado-base bg-gradient-to-br from-amber-50/80 via-white to-cream-50',
};

type Props = {
  label: string;
  valor: string | number;
  sub?: string | null;
  emoji?: string;
  tom?: AdminStatTom;
  href?: string;
  badge?: number;
};

function Inner({ label, valor, sub, emoji, tom = 'neutro', badge }: Omit<Props, 'href'>) {
  return (
    <div className="flex items-start gap-3">
      {emoji ? (
        <span className="text-2xl leading-none shrink-0" aria-hidden>
          {emoji}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-cafeteria-600">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-2xl md:text-3xl font-display font-semibold tabular-nums text-coffee-base">{valor}</p>
          {typeof badge === 'number' && badge > 0 && (
            <span className="text-xs font-bold rounded-full bg-amber-400 text-coffee-base px-2 py-0.5">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {sub ? <p className="text-xs text-cafeteria-600 mt-1 leading-snug">{sub}</p> : null}
      </div>
    </div>
  );
}

export function AdminStatCard(props: Props) {
  const cls = `rounded-2xl border border-cafeteria-200/90 border-l-4 shadow-sm p-4 min-h-[88px] ${TOM[props.tom ?? 'neutro']} ${
    props.href ? 'hover:shadow-md transition-shadow block' : ''
  }`;

  if (props.href) {
    return (
      <Link href={props.href} className={cls}>
        <Inner {...props} />
      </Link>
    );
  }

  return (
    <div className={cls}>
      <Inner {...props} />
    </div>
  );
}

export function AdminStatCardSkeleton() {
  return <div className="rounded-2xl border border-cafeteria-200 bg-white/80 h-[88px] animate-pulse" />;
}
