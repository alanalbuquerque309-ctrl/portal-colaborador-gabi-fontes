import type { ReactNode } from 'react';
import Link from 'next/link';

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  breadcrumb?: Crumb[];
  backHref?: string;
  backLabel?: string;
  illustration?: ReactNode;
  actions?: ReactNode;
};

export function PortalPageHeader({
  title,
  description,
  breadcrumb,
  backHref,
  backLabel = 'Voltar',
  illustration,
  actions,
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
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-coffee-base tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="text-sm md:text-base text-cafeteria-600 mt-1 max-w-2xl leading-relaxed">{description}</p>
            ) : null}
          </div>
          {illustration ? <div className="shrink-0 hidden sm:block">{illustration}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </header>
  );
}
