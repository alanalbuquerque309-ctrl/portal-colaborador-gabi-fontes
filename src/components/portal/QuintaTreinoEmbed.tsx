'use client';

type Props = {
  embedUrl: string;
  titulo: string;
  resumo: string;
  formato?: 'horizontal' | 'shorts';
};

/** Player YouTube embedado (sem abrir app externo). Suporta vídeo normal e Shorts. */
export function QuintaTreinoEmbed({ embedUrl, titulo, resumo, formato = 'horizontal' }: Props) {
  const vertical = formato === 'shorts';

  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-cafeteria-900">{titulo}</p>
        <p className="text-sm text-cafeteria-700 mt-1 leading-relaxed">{resumo}</p>
      </div>
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
