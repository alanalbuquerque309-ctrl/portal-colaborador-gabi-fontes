import type { ReactNode } from 'react';
import Link from 'next/link';

type Crumb = { label: string; href?: string };

type AcentoHeader = 'dourado' | 'oceano' | 'uva' | 'terracota' | 'mel' | 'verde';

const ACENTO_CHIP: Record<AcentoHeader, string> = {
  dourado: 'bg-dourado-50 text-dourado-500',
  oceano: 'bg-oceano-100 text-oceano-600',
  uva: 'bg-uva-100 text-uva-600',
  terracota: 'bg-terracota-100 text-terracota-600',
  mel: 'bg-mel-100 text-mel-600',
  verde: 'bg-portal-actionLight text-portal-action',
};

type Props = {
  title: string;
  description?: string;
  breadcrumb?: Crumb[];
  backHref?: string;
  backLabel?: string;
  illustration?: ReactNode;
  actions?: ReactNode;
  /** Emoji ou nó exibido num chip colorido antes do título. */
  icon?: ReactNode;
  /** Cor do chip de ícone (acento da página). */
  accent?: AcentoHeader;
};

export function PortalPageHeader({
  title,
  description,
  breadcrumb,
  backHref,
  backLabel = 'Voltar',
  illustration,
  actions,
  icon,
  accent = 'dourado',
}: Props) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-1">
      <div className="min-w-0 flex-1">
        {backHref ? (
          <Link href={backHref} className="text-sm text-dourado-base hover:underline font-medium inline-block mb-1.5">
            ← {backLabel}
          </Link>
        ) : null}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-xs text-cafeteria-500 mb-1.5 flex flex-wrap gap-1">
            {breadcrumb.map((c, i) => (
              <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-dourado-base hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {icon ? (
              <span
                aria-hidden
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl ${ACENTO_CHIP[accent]}`}
              >
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-coffee-base tracking-tight">
                {title}
              </h1>
              {description ? (
                <p className="text-sm md:text-base text-cafeteria-600 mt-1 max-w-2xl leading-relaxed">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {illustration ? <div className="shrink-0 hidden sm:block">{illustration}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </header>
  );
}
