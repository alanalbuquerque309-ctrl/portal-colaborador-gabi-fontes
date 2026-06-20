import type { ReactNode } from 'react';
import Link from 'next/link';

type Tom = 'dourado' | 'ambar' | 'neutro' | 'verde';

const TOM_CLASSES: Record<Tom, string> = {
  dourado: 'border-dourado-200 bg-gradient-to-br from-cream-50 to-white hover:border-dourado-base',
  ambar: 'border-amber-200 bg-amber-50/60 hover:border-amber-400',
  neutro: 'border-cafeteria-200 bg-white hover:border-dourado-base',
  verde: 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400',
};

const ICON_TOM: Record<Tom, string> = {
  dourado: 'bg-dourado-base/15 text-dourado-base',
  ambar: 'bg-amber-200/80 text-amber-950',
  neutro: 'bg-cafeteria-100 text-cafeteria-800',
  verde: 'bg-emerald-100 text-emerald-800',
};

type Props = {
  href: string;
  title: string;
  description: string;
  cta?: string;
  icon: ReactNode;
  badge?: ReactNode;
  tom?: Tom;
};

export function PortalActionCard({
  href,
  title,
  description,
  cta = 'Abrir →',
  icon,
  badge,
  tom = 'dourado',
}: Props) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors min-h-[44px] ${TOM_CLASSES[tom]}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ICON_TOM[tom]}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-coffee-base text-base leading-snug">
          {title}
          {badge}
        </span>
        <span className="block text-sm text-cafeteria-600 mt-1 leading-relaxed">{description}</span>
        <span className="inline-block mt-2 text-sm font-medium text-dourado-base">{cta}</span>
      </span>
    </Link>
  );
}
