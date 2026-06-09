'use client';

import type { AniversarianteHoje } from '@/lib/aniversario-hoje';

type Props = {
  aniversariantes: AniversarianteHoje[];
  parabenizouAlgum: boolean;
  excluirId?: string;
};

export function AniversarioFaixaHoje({ aniversariantes, parabenizouAlgum, excluirId }: Props) {
  const lista = aniversariantes.filter((a) => a.id !== excluirId);
  if (lista.length === 0) return null;

  return (
    <div className="fixed left-0 right-0 z-40 md:bottom-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] px-3 pointer-events-none">
      <div className="max-w-6xl mx-auto rounded-xl border border-dourado-200 bg-white/95 shadow-lg backdrop-blur-sm px-3 py-2.5 pointer-events-auto">
        <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <span className="text-lg shrink-0" aria-hidden>
            🎂
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-coffee-base">
              Aniversariantes de hoje
              {parabenizouAlgum ? ' · Você já parabenizou' : ''}
            </p>
            <p className="text-xs text-coffee-100 truncate">
              {lista.map((a) => a.primeiro_nome).join(' · ')}
            </p>
          </div>
          <div className="flex shrink-0 -space-x-2">
            {lista.slice(0, 4).map((a) =>
              a.foto_url ? (
                <img
                  key={a.id}
                  src={a.foto_url}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                />
              ) : (
                <div
                  key={a.id}
                  className="w-8 h-8 rounded-full border-2 border-white bg-dourado-100 flex items-center justify-center text-xs font-medium text-dourado-700"
                >
                  {a.primeiro_nome.charAt(0)}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
