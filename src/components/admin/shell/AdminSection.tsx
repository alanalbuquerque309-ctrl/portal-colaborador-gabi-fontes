import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md';
};

export function AdminSection({
  title,
  description,
  action,
  children,
  className = '',
  padding = 'md',
}: Props) {
  const pad = padding === 'sm' ? 'p-4' : 'p-5 md:p-6';
  return (
    <section
      className={`rounded-2xl border border-cafeteria-200/90 bg-white shadow-sm ${pad} ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg text-coffee-base">{title}</h2>
          {description ? <p className="text-sm text-cafeteria-600 mt-0.5">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
