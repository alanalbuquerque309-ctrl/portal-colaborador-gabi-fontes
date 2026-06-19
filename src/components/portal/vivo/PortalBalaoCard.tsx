import type { ReactNode } from 'react';

type Tom = 'creme' | 'verde' | 'dourado' | 'branco';

const TOM: Record<Tom, string> = {
  creme: 'border-dourado-200/80 bg-gradient-to-br from-cream-50 via-white to-dourado-50/30',
  verde: 'border-portal-action/30 bg-gradient-to-br from-portal-actionLight/40 via-white to-emerald-50/40',
  dourado: 'border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-cream-50 to-white',
  branco: 'border-cafeteria-200 bg-white/95',
};

/** Card “balão” sem desenhos — conteúdo limpo. */
export function PortalBalaoCard({
  children,
  className = '',
  tom = 'creme',
  ramoCanto: _ramoCanto = 'nenhum',
}: {
  children: ReactNode;
  className?: string;
  tom?: Tom;
  /** Legado: ramos SVG removidos; prop ignorada. */
  ramoCanto?: 'nenhum' | 'esquerda' | 'direita' | 'ambos';
}) {
  return (
    <div className={`relative rounded-2xl border shadow-sm overflow-hidden ${TOM[tom]} ${className}`}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Fundo ambiente (CSS): café + folhagem, visível em mobile e desktop. */
export function PortalAmbientePagina() {
  return <div className="portal-ambiente-fundo pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
