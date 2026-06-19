import type { ReactNode } from 'react';
import Image from 'next/image';

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

/** Fotos fixas nos cantos: grãos torrados (esquerda) + folhagem de cafezal (direita). */
export function PortalDecoracaoRamosPagina() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden sm:block" aria-hidden>
      <div className="absolute bottom-0 left-0 w-[min(42vw,280px)] h-[min(36vh,240px)] opacity-[0.88]">
        <Image
          src="/decoracao/graos-cafe-canto.png"
          alt=""
          fill
          sizes="280px"
          className="object-contain object-left-bottom"
          priority={false}
        />
      </div>
      <div className="absolute bottom-0 right-0 w-[min(42vw,280px)] h-[min(36vh,240px)] opacity-[0.82]">
        <Image
          src="/decoracao/folhagem-cafezal-canto.png"
          alt=""
          fill
          sizes="280px"
          className="object-contain object-right-bottom"
          priority={false}
        />
      </div>
    </div>
  );
}
