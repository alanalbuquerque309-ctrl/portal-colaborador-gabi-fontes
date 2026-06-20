import type { ReactNode } from 'react';
import Link from 'next/link';

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  breadcrumb?: Crumb[];
  actions?: ReactNode;
};

export function AdminPageHeader({ title, description, breadcrumb, actions }: Props) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
      <div className="min-w-0">
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
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-coffee-base tracking-tight">
          {title}
        </h1>
        {description ? <p className="text-sm md:text-base text-cafeteria-600 mt-1 max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </header>
  );
}
