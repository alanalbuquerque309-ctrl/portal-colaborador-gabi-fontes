'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  VIDEO_ELEMENT_CLASS,
  VIDEO_FRAME_INNER_CLASS,
  VIDEO_FRAME_OUTER_CLASS,
  VIDEO_FRAME_STYLE,
} from '@/lib/video-boas-vindas-layout';
import { isVideoArquivoLocal } from '@/lib/video-boas-vindas';
import { XicaraCarregando } from '@/components/ui/XicaraCarregando';

interface VideoBoasVindasProps {
  /** Se omitido, busca GET /api/portal/video-boas-vindas */
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

function loadScript(scriptSrc: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${scriptSrc}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = scriptSrc;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script'));
    document.body.appendChild(s);
  });
}

function FrameVertical({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${VIDEO_FRAME_OUTER_CLASS} ${className}`.trim()} style={VIDEO_FRAME_STYLE}>
      <div className={VIDEO_FRAME_INNER_CLASS}>{children}</div>
    </div>
  );
}

export function VideoBoasVindas({
  src: srcProp,
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
  const [src, setSrc] = useState<string | undefined>(srcProp);
  const [carregandoUrl, setCarregandoUrl] = useState(!srcProp);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  useEffect(() => {
    if (srcProp) {
      setSrc(srcProp);
      setCarregandoUrl(false);
      return;
    }
    let cancel = false;
    setCarregandoUrl(true);
    fetch('/api/portal/video-boas-vindas', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; url?: string }) => {
        if (cancel) return;
        if (d.ok && d.url) setSrc(String(d.url));
        else setErroCarregamento('Não foi possível obter o endereço do vídeo.');
      })
      .catch(() => {
        if (!cancel) setErroCarregamento('Erro de rede ao carregar o vídeo.');
      })
      .finally(() => {
        if (!cancel) setCarregandoUrl(false);
      });
    return () => {
      cancel = true;
    };
  }, [srcProp]);

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
        setErroCarregamento('Toque em ▶ play para iniciar o vídeo.');
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
        player = new window.YT!.Player(el, {
          videoId,
          height: '100%',
          width: '100%',
          playerVars: { rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (e: { data: number }) => {
              if (e.data === (window.YT!.PlayerState?.ENDED ?? 0)) markComplete();
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

  const legendaRodape = modoBiblioteca
    ? 'Revise o vídeo quando quiser. No primeiro acesso, assista até o fim e responda ao questionário.'
    : 'Vídeo vertical (9:16). Toque em ▶ play e assista até o final para liberar o próximo passo.';

  if (carregandoUrl) {
    return (
      <div className="flex justify-center py-12">
        <XicaraCarregando size="md" label="Carregando vídeo…" />
      </div>
    );
  }

  if (!src) {
    const isDev = process.env.NODE_ENV === 'development';
    return (
      <div className="space-y-3">
        <FrameVertical className={className}>
          <p className="text-cream-100 text-sm text-center px-4">Vídeo institucional indisponível.</p>
        </FrameVertical>
        {erroCarregamento && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroCarregamento}</p>
        )}
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
    <div className="space-y-2">
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroCarregamento}</p>
      {!isYouTube && !isVimeo && (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-medium text-dourado-base underline"
        >
          Abrir vídeo em nova aba
        </a>
      )}
    </div>
  ) : null;

  if (isYouTube) {
    return (
      <div className="space-y-3">
        <FrameVertical className={className}>
          <div className="relative w-full h-full min-h-0">
            <div id={containerId} className="absolute inset-0 w-full h-full" key={rewatchTick} />
          </div>
        </FrameVertical>
        {blocoErro}
        {(modoBiblioteca || assistidoCompleto) && (
          <button type="button" onClick={handleRewatch} className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50">
            Assistir novamente
          </button>
        )}
        <p className="text-coffee-100 text-xs text-center">{legendaRodape}</p>
      </div>
    );
  }

  if (isVimeo) {
    const videoId = src.match(/vimeo\.com\/(\d+)/)?.[1];
    if (!videoId) return null;
    return (
      <div className="space-y-3">
        <FrameVertical className={className}>
          <div className="relative w-full h-full min-h-0">
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
        </FrameVertical>
        {blocoErro}
        {(modoBiblioteca || assistidoCompleto) && (
          <button type="button" onClick={handleRewatch} className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50">
            Assistir novamente
          </button>
        )}
        <p className="text-coffee-100 text-xs text-center">{legendaRodape}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FrameVertical className={className}>
        <video
          key={`${src}-${rewatchTick}`}
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          playsInline
          preload="auto"
          className={VIDEO_ELEMENT_CLASS}
          onLoadedData={() => setErroCarregamento(null)}
          onEnded={() => markComplete()}
          onError={() => {
            if (isVideoArquivoLocal(src)) {
              setErroCarregamento(
                'Arquivo local não encontrado neste servidor. O vídeo deve vir do Supabase Storage em produção.'
              );
            } else {
              setErroCarregamento('Não foi possível reproduzir o vídeo aqui. Use o link abaixo para abrir em nova aba.');
            }
          }}
        >
          Seu navegador não suporta vídeo HTML5.
        </video>
      </FrameVertical>
      {blocoErro}
      {(modoBiblioteca || assistidoCompleto) && (
        <button type="button" onClick={handleRewatch} className="w-full rounded-lg border border-dourado-300 bg-white px-4 py-3 text-sm font-medium text-coffee-base hover:bg-cream-50">
          Assistir novamente
        </button>
      )}
      <p className="text-coffee-100 text-xs text-center px-2">{legendaRodape}</p>
    </div>
  );
}
