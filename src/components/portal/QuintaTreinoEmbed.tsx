'use client';

import { useEffect } from 'react';
import type { QuintaTreinoApresentador } from '@/lib/graos/quinta-treino';

type Props = {
  embedUrl: string;
  titulo: string;
  resumo: string;
  apresentador?: QuintaTreinoApresentador | null;
  formato?: 'horizontal' | 'shorts';
  /** Dispara uma vez quando o player é exibido (rastreamento de audiência). */
  onExibir?: () => void;
};

function BlocoApresentador({ apresentador }: { apresentador: QuintaTreinoApresentador }) {
  const temNome = Boolean(apresentador.nome.trim());
  const temCargo = Boolean(apresentador.cargo.trim());
  const temCredencial = Boolean(apresentador.credencial.trim());
  if (!temNome && !temCargo && !temCredencial) return null;

  return (
    <div className="rounded-lg border border-dourado-300/80 bg-dourado-50/70 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-dourado-800">Quem fala neste treino</p>
      {(temNome || temCargo) && (
        <p className="mt-1.5 font-semibold text-cafeteria-900 leading-snug">
          {temNome ? apresentador.nome : 'Apresentação'}
          {temCargo ? (
            <>
              <span className="font-normal text-cafeteria-600"> · </span>
              <span className="font-medium text-cafeteria-800">{apresentador.cargo}</span>
            </>
          ) : null}
        </p>
      )}
      {temCredencial && (
        <p className="mt-1 text-sm text-cafeteria-700 leading-relaxed">{apresentador.credencial}</p>
      )}
    </div>
  );
}

/** Player YouTube embedado (sem abrir app externo). Suporta vídeo normal e Shorts. */
export function QuintaTreinoEmbed({
  embedUrl,
  titulo,
  resumo,
  apresentador,
  formato = 'horizontal',
  onExibir,
}: Props) {
  const vertical = formato === 'shorts';

  useEffect(() => {
    onExibir?.();
  }, [onExibir]);

  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-cafeteria-900">{titulo}</p>
        <p className="text-sm text-cafeteria-700 mt-1 leading-relaxed">{resumo}</p>
      </div>
      {apresentador ? <BlocoApresentador apresentador={apresentador} /> : null}
      <div
        className={`relative overflow-hidden rounded-xl border border-cafeteria-200 bg-black mx-auto ${
          vertical ? 'w-full max-w-[280px] aspect-[9/16]' : 'w-full aspect-video'
        }`}
      >
        <iframe
          src={embedUrl}
          title={titulo}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <p className="text-xs text-cafeteria-500 leading-snug">
        Reprodução dentro do portal; use vídeos do canal Gabi Fontes para evitar anúncios de terceiros.
      </p>
    </div>
  );
}
