'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface VideoBoasVindasProps {
  /** URL do vídeo (YouTube, Vimeo ou arquivo direto). */
  src?: string;
  poster?: string;
  className?: string;
  /** Disparado uma vez quando o vídeo é assistido até o fim (primeira vez). */
  onFirstWatchComplete?: () => void;
  /** Se já concluiu uma vez — mostra opção de assistir novamente sem bloquear o próximo passo. */
  assistidoCompleto?: boolean;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        id: string | HTMLElement,
        options: {
          videoId?: string;
          height?: string | number;
          width?: string | number;
          playerVars?: Record<string, number | string>;
          events?: { onStateChange?: (e: { data: number }) => void };
        }
      ) => { destroy?: () => void };
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: { Player: new (el: HTMLIFrameElement) => { on: (ev: string, fn: () => void) => void } };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script'));
    document.body.appendChild(s);
  });
}

export function VideoBoasVindas({
  src,
  poster,
  className = '',
  onFirstWatchComplete,
  assistidoCompleto = false,
}: VideoBoasVindasProps) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `yt-${reactId}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeVimeoRef = useRef<HTMLIFrameElement>(null);
  /** Garante que o callback de “primeira conclusão” dispare só uma vez (rewatch não reenvia). */
  const callbackFiredRef = useRef(false);
  const [rewatchTick, setRewatchTick] = useState(0);

  const markComplete = useCallback(() => {
    if (callbackFiredRef.current) return;
    callbackFiredRef.current = true;
    onFirstWatchComplete?.();
  }, [onFirstWatchComplete]);

  const handleRewatch = () => {
    setRewatchTick((t) => t + 1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    }
  };

  useEffect(() => {
    if (!src) return;
    const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
    const videoId = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/)?.[1];
    if (!isYouTube || !videoId) return;

    let destroyed = false;
    let player: { destroy?: () => void } | null = null;

    const init = () => {
      if (destroyed || !window.YT?.Player) return;
      requestAnimationFrame(() => {
        if (destroyed) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        const YTapi = window.YT;
        if (!YTapi?.Player) return;
        player = new YTapi.Player(el, {
          videoId,
          height: '100%',
          width: '100%',
          playerVars: { rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (e: { data: number }) => {
              const ended = YTapi.PlayerState?.ENDED ?? 0;
              if (e.data === ended) markComplete();
            },
          },
        });
      });
    };

    const chain = () => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        init();
      };
      if (window.YT?.Player) {
        init();
      } else {
        void loadScript('https://www.youtube.com/iframe_api').catch(() => {});
      }
    };

    chain();

    return () => {
      destroyed = true;
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [containerId, src, markComplete, rewatchTick]);

  useEffect(() => {
    if (!src) return;
    const isVimeo = src.includes('vimeo.com');
    const vimeoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!isVimeo || !vimeoId) return;

    let cancelled = false;
    void (async () => {
      try {
        await loadScript('https://player.vimeo.com/api/player.js');
        if (cancelled || !iframeVimeoRef.current || !(window as unknown as { Vimeo?: { Player: unknown } }).Vimeo)
          return;
        const VimeoPlayer = (window as unknown as { Vimeo: { Player: new (el: HTMLIFrameElement) => { on: (e: string, fn: () => void) => void } } }).Vimeo.Player;
        const p = new VimeoPlayer(iframeVimeoRef.current);
        p.on('ended', () => markComplete());
      } catch {
        /* fallback: sem SDK */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, markComplete, rewatchTick]);

  if (!src) {
    const isDev = process.env.NODE_ENV === 'development';
    return (
      <div className={`space-y-3 ${className}`}>
        <div
          className="relative w-full aspect-video bg-cafeteria-900 flex items-center justify-center overflow-hidden rounded-xl"
          aria-label="Vídeo institucional"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cafeteria-800/90 to-cafeteria-950/90" />
          <div className="relative z-10 text-center px-4">
            <p className="text-cream-100 font-display text-lg">Vídeo institucional</p>
            <p className="text-cream-200/80 text-sm mt-2">
              Configure <code className="text-xs bg-black/30 px-1 rounded">NEXT_PUBLIC_VIDEO_BOAS_VINDAS</code> com a URL do YouTube, Vimeo ou arquivo de vídeo.
            </p>
          </div>
        </div>
        {isDev && (
          <button
            type="button"
            onClick={markComplete}
            className="w-full rounded-lg border border-dourado-400 bg-dourado-50 px-4 py-2 text-sm text-coffee-base"
          >
            [Dev] Simular vídeo assistido até o fim
          </button>
        )}
      </div>
    );
  }

  const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
  const isVimeo = src.includes('vimeo.com');

  if (isYouTube) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black">
          <div id={containerId} className="absolute inset-0 w-full h-full" key={rewatchTick} />
        </div>
        {assistidoCompleto && (
          <button
            type="button"
            onClick={handleRewatch}
            className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50"
          >
            Assistir novamente
          </button>
        )}
        <p className="text-coffee-100 text-xs">
          Assista ao vídeo até o final para liberar o próximo passo. Você poderá assistir de novo
          depois que concluir uma vez.
        </p>
      </div>
    );
  }

  if (isVimeo) {
    const videoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative w-full aspect-video overflow-hidden rounded-xl">
          <iframe
            key={rewatchTick}
            ref={iframeVimeoRef}
            src={`https://player.vimeo.com/video/${videoId}`}
            title="Vídeo institucional - Gabi Fontes"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        {assistidoCompleto && (
          <button
            type="button"
            onClick={handleRewatch}
            className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50"
          >
            Assistir novamente
          </button>
        )}
        <p className="text-coffee-100 text-xs">
          Assista ao vídeo até o final. Se o botão não liberar, atualize a página e assista novamente
          até o encerramento.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`relative w-full aspect-video overflow-hidden rounded-xl ${className}`}>
        <video
          key={rewatchTick}
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          playsInline
          className="w-full h-full object-cover"
          onEnded={() => markComplete()}
        >
          Seu navegador não suporta vídeo.
        </video>
      </div>
      {assistidoCompleto && (
        <button
          type="button"
          onClick={handleRewatch}
          className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50"
        >
          Assistir novamente
        </button>
      )}
      <p className="text-coffee-100 text-xs">Assista até o final do vídeo para continuar.</p>
    </div>
  );
}
