import type { ReactNode } from 'react';
import { IlustracaoRamoCafe } from './PortalIlustracao';

type Tom = 'creme' | 'verde' | 'dourado' | 'branco';

const TOM: Record<Tom, string> = {
  creme: 'border-dourado-200/80 bg-gradient-to-br from-cream-50 via-white to-dourado-50/30',
  verde: 'border-portal-action/30 bg-gradient-to-br from-portal-actionLight/40 via-white to-emerald-50/40',
  dourado: 'border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-cream-50 to-white',
  branco: 'border-cafeteria-200 bg-white/95',
};

/** Card “balão” com ramos decorativos (mockup portal vivo). */
export function PortalBalaoCard({
  children,
  className = '',
  tom = 'creme',
  ramoCanto = 'direita',
}: {
  children: ReactNode;
  className?: string;
  tom?: Tom;
  ramoCanto?: 'nenhum' | 'esquerda' | 'direita' | 'ambos';
}) {
  return (
    <div
      className={`relative rounded-2xl border shadow-sm overflow-hidden ${TOM[tom]} ${className}`}
    >
      {(ramoCanto === 'esquerda' || ramoCanto === 'ambos') && (
        <IlustracaoRamoCafe
          className="pointer-events-none absolute -bottom-2 -left-1 w-16 h-16 sm:w-20 sm:h-20 opacity-70"
        />
      )}
      {(ramoCanto === 'direita' || ramoCanto === 'ambos') && (
        <IlustracaoRamoCafe
          espelhar
          className="pointer-events-none absolute -bottom-1 -right-1 w-14 h-14 sm:w-20 sm:h-20 opacity-65"
        />
      )}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Ramos nos cantos da página (home, comunicação). */
export function PortalDecoracaoRamosPagina() {
  return (
    <>
      <IlustracaoRamoCafe
        className="pointer-events-none fixed bottom-24 left-0 w-20 h-20 sm:w-28 sm:h-28 opacity-40 z-0 hidden sm:block"
        aria-hidden
      />
      <IlustracaoRamoCafe
        espelhar
        className="pointer-events-none fixed bottom-32 right-0 w-16 h-16 sm:w-24 sm:h-24 opacity-35 z-0 hidden sm:block"
        aria-hidden
      />
    </>
  );
}
