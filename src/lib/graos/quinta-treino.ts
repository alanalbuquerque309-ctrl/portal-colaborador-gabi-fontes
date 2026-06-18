/** Treino da quinta — vídeo embedado (YouTube) por perfil. */

export type QuintaTreinoPerfil = 'colaborador' | 'lider';

function envLimpo(valor: string | undefined | null): string {
  const v = String(valor ?? '').trim();
  if (!v || v.toLowerCase() === 'undefined' || v.toLowerCase() === 'null') return '';
  return v;
}

/** True se a URL original for um Short (vertical). */
export function isYoutubeShortsUrl(url: string): boolean {
  return /youtube\.com\/shorts\//i.test(url.trim());
}

/** Extrai ID do YouTube de URL completa, Shorts ou ID puro (11 caracteres). */
export function extrairYoutubeVideoId(urlOuId: string): string | null {
  const raw = urlOuId.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * URL de embed «limpa»: youtube-nocookie, sem vídeos sugeridos no fim (rel=0), marca discreta.
 * Nota: anúncios só aparecem se o vídeo/canal tiver monetização ativa no YouTube.
 */
export function urlEmbedYoutubeTreino(videoId: string, origin?: string): string {
  const params = new URLSearchParams({
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
  });
  if (origin) params.set('origin', origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export type QuintaTreinoConfig = {
  perfil: QuintaTreinoPerfil;
  titulo: string;
  resumo: string;
  youtube_video_id: string | null;
  embed_url: string | null;
  /** vertical = Shorts / vídeo 9:16 */
  formato: 'horizontal' | 'shorts';
};

function resolverFormato(urlRaw: string, perfil: QuintaTreinoPerfil): QuintaTreinoConfig['formato'] {
  const formatoEnv = envLimpo(
    typeof process !== 'undefined'
      ? perfil === 'lider'
        ? process.env.NEXT_PUBLIC_QUINTA_FORMATO_LIDERES
        : process.env.NEXT_PUBLIC_QUINTA_FORMATO
      : ''
  );
  if (formatoEnv === 'shorts' || formatoEnv === 'vertical') return 'shorts';
  if (urlRaw && isYoutubeShortsUrl(urlRaw)) return 'shorts';
  return 'horizontal';
}

/** Configuração do treino da quinta para colaboradores ou liderança. */
export function resolverQuintaTreino(
  origin: string | undefined,
  perfil: QuintaTreinoPerfil
): QuintaTreinoConfig {
  const urlRaw = envLimpo(
    typeof process !== 'undefined'
      ? perfil === 'lider'
        ? process.env.NEXT_PUBLIC_QUINTA_YOUTUBE_URL_LIDERES
        : process.env.NEXT_PUBLIC_QUINTA_YOUTUBE_URL
      : ''
  );
  const videoId = urlRaw ? extrairYoutubeVideoId(urlRaw) : null;
  const formato = urlRaw ? resolverFormato(urlRaw, perfil) : 'horizontal';

  const tituloDefault =
    perfil === 'lider'
      ? 'Quinta do café — treino para liderança'
      : 'Quinta do café — treino da semana';

  const resumoDefault =
    perfil === 'lider'
      ? 'Vídeo exclusivo para quem avalia a equipe. Assista dentro do portal.'
      : 'Assista ao vídeo abaixo (fica dentro do portal). Depois confirme para ganhar +5 Grãos.';

  const tituloEnv =
    perfil === 'lider'
      ? envLimpo(typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_QUINTA_TITULO_LIDERES : '')
      : envLimpo(typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_QUINTA_TITULO : '');

  const resumoEnv =
    perfil === 'lider'
      ? envLimpo(typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_QUINTA_RESUMO_LIDERES : '')
      : envLimpo(typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_QUINTA_RESUMO : '');

  return {
    perfil,
    titulo: tituloEnv || tituloDefault,
    resumo: resumoEnv || resumoDefault,
    youtube_video_id: videoId,
    embed_url: videoId ? urlEmbedYoutubeTreino(videoId, origin) : null,
    formato,
  };
}
