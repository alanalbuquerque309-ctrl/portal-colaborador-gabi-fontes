import type { ReactNode } from 'react';

type CorGrupo = 'uva' | 'oceano' | 'terracota' | 'mel' | 'verde';
type IconeGrupo = 'estrela' | 'livro' | 'coracao' | 'raio';

const COR: Record<CorGrupo, { linha: string; chipBg: string; chipText: string }> = {
  uva: { linha: 'bg-uva-300', chipBg: 'bg-uva-100', chipText: 'text-uva-600' },
  oceano: { linha: 'bg-oceano-300', chipBg: 'bg-oceano-100', chipText: 'text-oceano-600' },
  terracota: { linha: 'bg-terracota-300', chipBg: 'bg-terracota-100', chipText: 'text-terracota-600' },
  mel: { linha: 'bg-mel-300', chipBg: 'bg-mel-100', chipText: 'text-mel-600' },
  verde: { linha: 'bg-portal-action', chipBg: 'bg-portal-actionLight', chipText: 'text-portal-action' },
};

const ICONE: Record<IconeGrupo, string> = {
  estrela: '✨',
  livro: '📚',
  coracao: '💛',
  raio: '⚡',
};

type Props = {
  titulo: string;
  subtitulo?: string;
  cor?: CorGrupo;
  icone?: IconeGrupo;
  children: ReactNode;
};

/** Cabeçalho de grupo da home: organiza seções por tema com cor e ícone. */
export function PortalHomeGrupo({ titulo, subtitulo, cor = 'uva', icone = 'estrela', children }: Props) {
  const c = COR[cor];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${c.chipBg} ${c.chipText}`}
        >
          {ICONE[icone]}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-display font-semibold text-cafeteria-900 leading-tight">{titulo}</h2>
          {subtitulo ? <p className="text-sm text-cafeteria-600">{subtitulo}</p> : null}
        </div>
        <span className={`hidden sm:block h-1 flex-1 rounded-full ${c.linha} opacity-30`} aria-hidden />
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
