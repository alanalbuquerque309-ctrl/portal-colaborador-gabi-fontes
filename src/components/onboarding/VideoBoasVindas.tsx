'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { VIDEO_FRAME_CLASS } from '@/lib/video-boas-vindas-layout';
import { isVideoArquivoLocal } from '@/lib/video-boas-vindas';

interface VideoBoasVindasProps {
  /** URL do vídeo (YouTube, Vimeo, Supabase Storage ou arquivo local). */
  src?: string;
  poster?: string;
  className?: string;
  onFirstWatchComplete?: () => void;
  assistidoCompleto?: boolean;
  modoBiblioteca?: boolean;
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
  modoBiblioteca = false,
}: VideoBoasVindasProps) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `yt-${reactId}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeVimeoRef = useRef<HTMLIFrameElement>(null);
  const callbackFiredRef = useRef(false);
  const [rewatchTick, setRewatchTick] = useState(0);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const markComplete = useCallback(() => {
    if (modoBiblioteca) return;
    if (callbackFiredRef.current) return;
    callbackFiredRef.current = true;
    onFirstWatchComplete?.();
  }, [onFirstWatchComplete, modoBiblioteca]);

  const handleRewatch = () => {
    setErroCarregamento(null);
    setRewatchTick((t) => t + 1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {
        setErroCarregamento('Toque em play para iniciar o vídeo.');
      });
    }
  };

  useEffect(() => {
    setErroCarregamento(null);
    callbackFiredRef.current = false;
  }, [src, rewatchTick]);

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

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      init();
    };
    if (window.YT?.Player) init();
    else void loadScript('https://www.youtube.com/iframe_api').catch(() => {});

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
        if (cancelled || !iframeVimeoRef.current || !window.Vimeo) return;
        const p = new window.Vimeo.Player(iframeVimeoRef.current);
        p.on('ended', () => markComplete());
      } catch {
        /* fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, markComplete, rewatchTick]);

  const frameClass = `${VIDEO_FRAME_CLASS} ${className}`.trim();
  const legendaRodape = modoBiblioteca
    ? 'Revise o vídeo quando quiser. No primeiro acesso ele é obrigatório até o fim, com questionário em seguida.'
    : 'Assista ao vídeo até o final para liberar o próximo passo. Você poderá assistir de novo depois que concluir uma vez.';

  if (!src) {
    const isDev = process.env.NODE_ENV === 'development';
    return (
      <div className="space-y-3">
        <div className={frameClass} aria-label="Vídeo institucional">
          <div className="absolute inset-0 bg-gradient-to-b from-cafeteria-800/90 to-cafeteria-950/90 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-cream-100 font-display text-lg">Vídeo institucional</p>
              <p className="text-cream-200/80 text-sm mt-2">
                Configure a URL do vídeo ou rode <code className="text-xs bg-black/30 px-1 rounded">npm run upload:video-boas-vindas</code>.
              </p>
            </div>
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

  const blocoErro = erroCarregamento ? (
    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroCarregamento}</p>
  ) : null;

  if (isYouTube) {
    return (
      <div className="space-y-3">
        <div className={frameClass}>
          <div id={containerId} className="absolute inset-0 w-full h-full" key={rewatchTick} />
        </div>
        {blocoErro}
        {(modoBiblioteca || assistidoCompleto) && (
          <button type="button" onClick={handleRewatch} className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50">
            Assistir novamente
          </button>
        )}
        <p className="text-coffee-100 text-xs">{legendaRodape}</p>
      </div>
    );
  }

  if (isVimeo) {
    const videoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className="space-y-3">
        <div className={frameClass}>
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
        {blocoErro}
        {(modoBiblioteca || assistidoCompleto) && (
          <button type="button" onClick={handleRewatch} className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50">
            Assistir novamente
          </button>
        )}
        <p className="text-coffee-100 text-xs">{legendaRodape}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={frameClass}>
        <video
          key={rewatchTick}
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-contain"
          onEnded={() => markComplete()}
          onError={() => {
            if (isVideoArquivoLocal(src)) {
              setErroCarregamento(
                'Vídeo local não encontrado neste servidor. Em produção, rode npm run upload:video-boas-vindas ou configure NEXT_PUBLIC_VIDEO_BOAS_VINDAS na Vercel.'
              );
            } else {
              setErroCarregamento(
                'Não foi possível carregar o vídeo. Verifique a conexão ou peça ao administrador para republicar o arquivo.'
              );
            }
          }}
        >
          Seu navegador não suporta vídeo.
        </video>
      </div>
      {blocoErro}
      {(modoBiblioteca || assistidoCompleto) && (
        <button type="button" onClick={handleRewatch} className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50">
          Assistir novamente
        </button>
      )}
      <p className="text-coffee-100 text-xs text-center max-w-sm mx-auto">
        {modoBiblioteca ? 'Vídeo em formato vertical (9:16). Toque em play se não iniciar sozinho.' : 'Vídeo vertical (9:16). Assista até o final para continuar.'}
      </p>
    </div>
  );
}
