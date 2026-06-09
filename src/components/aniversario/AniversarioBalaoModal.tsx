'use client';

import type { AniversarianteHoje } from '@/lib/aniversario-hoje';
import { ConfettiLeve } from './ConfettiLeve';

function AvatarAniversariante({ nome, fotoUrl }: { nome: string; fotoUrl: string | null }) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt=""
        className="w-20 h-20 rounded-full object-cover border-2 border-dourado-300 shadow-md mx-auto"
      />
    );
  }
  return (
    <div className="w-20 h-20 rounded-full bg-dourado-100 flex items-center justify-center border-2 border-dourado-300 shadow-md mx-auto">
      <span className="text-dourado-700 font-display text-2xl">{nome.charAt(0).toUpperCase()}</span>
    </div>
  );
}

type Props = {
  aberto: boolean;
  souAniversariante: boolean;
  alvo: AniversarianteHoje | null;
  meusParabensCount: number;
  totalPendentes: number;
  indiceAtual: number;
  enviando: boolean;
  previewAtivo: boolean;
  redeAtiva: boolean;
  onParabens: () => void;
  onDispensar: () => void;
};

export function AniversarioBalaoModal({
  aberto,
  souAniversariante,
  alvo,
  meusParabensCount,
  totalPendentes,
  indiceAtual,
  enviando,
  previewAtivo,
  redeAtiva,
  onParabens,
  onDispensar,
}: Props) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[68] bg-black/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-4 pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] sm:pb-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-dourado-200 bg-gradient-to-b from-white to-cream-50 p-5 shadow-2xl animate-aniversario-balao-in">
        <ConfettiLeve />

        {souAniversariante ? (
          <>
            <p className="text-center text-3xl mb-2" aria-hidden>
              🎂
            </p>
            <h2 className="font-display text-xl text-coffee-base font-semibold text-center">
              Feliz aniversário!
            </h2>
            <p className="text-sm text-coffee-100 mt-2 text-center leading-relaxed">
              Saúde, sucesso, sabedoria e as melhores energias da equipe Gabi Fontes com você hoje.
            </p>
            <p className="mt-4 text-center text-sm font-medium text-dourado-700">
              {meusParabensCount === 0
                ? 'Sua equipe está chegando para te parabenizar.'
                : `${meusParabensCount} colega${meusParabensCount === 1 ? '' : 's'} te parabenizou${meusParabensCount === 1 ? '' : 'ram'} hoje`}
            </p>
            <button
              type="button"
              disabled={enviando}
              onClick={onDispensar}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-dourado-base text-cream-100 text-sm font-medium hover:bg-dourado-400 disabled:opacity-60"
            >
              OK
            </button>
          </>
        ) : alvo ? (
          <>
            <p className="text-center text-3xl mb-3" aria-hidden>
              🎉
            </p>
            <AvatarAniversariante nome={alvo.nome} fotoUrl={alvo.foto_url} />
            <h2 className="font-display text-lg text-coffee-base font-semibold text-center mt-3">
              {alvo.nome} faz aniversário hoje!
            </h2>
            {alvo.unidade_nome && (
              <p className="text-xs text-coffee-100 text-center mt-1">{alvo.unidade_nome}</p>
            )}
            {totalPendentes > 1 && (
              <p className="text-xs text-center text-coffee-100 mt-2">
                {indiceAtual + 1} de {totalPendentes} aniversariantes de hoje
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={onParabens}
                className="w-full min-h-[44px] rounded-xl bg-dourado-base text-cream-100 text-sm font-medium hover:bg-dourado-400 disabled:opacity-60"
              >
                Mandar parabéns para {alvo.primeiro_nome}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={onDispensar}
                className="w-full min-h-[44px] rounded-xl border border-cream-300 bg-white text-sm font-medium text-coffee-base hover:bg-cream-50 disabled:opacity-60"
              >
                OK
              </button>
            </div>
          </>
        ) : null}

        {previewAtivo && !redeAtiva && (
          <p className="text-[10px] text-center text-amber-700/90 mt-3">Preview interno (Alan e Gabriela)</p>
        )}
      </div>
    </div>
  );
}
