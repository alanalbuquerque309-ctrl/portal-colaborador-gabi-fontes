'use client';

interface VideoBoasVindasProps {
  /** URL do vídeo (YouTube, Vimeo ou arquivo direto). Deixe vazio para placeholder. */
  src?: string;
  /** URL da thumbnail para fallback ou preview */
  poster?: string;
  className?: string;
}

export function VideoBoasVindas({ src, poster, className = '' }: VideoBoasVindasProps) {
  if (!src) {
    return (
      <div
        className={`relative w-full aspect-video bg-cafeteria-900 flex items-center justify-center overflow-hidden ${className}`}
        aria-label="Vídeo de boas-vindas"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-cafeteria-800/90 to-cafeteria-950/90" />
        <div className="relative z-10 text-center px-4">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-dourado-500 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-dourado-500 ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-cream-100 font-display text-lg">Vídeo de boas-vindas</p>
          <p className="text-cream-200/80 text-sm mt-1">Em breve</p>
        </div>
      </div>
    );
  }

  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');

  if (isYouTube) {
    const videoId = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className={`relative w-full aspect-video overflow-hidden rounded-b-2xl ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title="Vídeo de boas-vindas - Gabi Fontes"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isVimeo) {
    const videoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className={`relative w-full aspect-video overflow-hidden rounded-b-2xl ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Vídeo de boas-vindas - Gabi Fontes"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video overflow-hidden rounded-b-2xl ${className}`}>
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        className="w-full h-full object-cover"
      >
        Seu navegador não suporta vídeo.
      </video>
    </div>
  );
}
