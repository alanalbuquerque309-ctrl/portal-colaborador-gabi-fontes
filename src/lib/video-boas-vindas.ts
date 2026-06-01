/** Título exibido no onboarding e na biblioteca do portal. */
export const VIDEO_BOAS_VINDAS_TITULO = 'Vídeo institucional de boas-vindas';

/** Caminho local (dev): `public/onboarding/boas-vindas.mp4` — não existe na Vercel. */
export const VIDEO_BOAS_VINDAS_PATH_LOCAL = '/onboarding/boas-vindas.mp4';

/** Bucket Supabase Storage (público) para o vídeo de onboarding. */
export const VIDEO_BOAS_VINDAS_STORAGE_BUCKET = 'portal-onboarding';
export const VIDEO_BOAS_VINDAS_STORAGE_OBJECT = 'boas-vindas.mp4';

export function isVideoArquivoLocal(src: string): boolean {
  const s = src.trim();
  return s.startsWith('/') && !s.startsWith('//');
}

function supabasePublicVideoUrl(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${VIDEO_BOAS_VINDAS_STORAGE_BUCKET}/${VIDEO_BOAS_VINDAS_STORAGE_OBJECT}`;
}

/**
 * URL efetiva do vídeo (servidor ou build).
 * Em produção, ignora override local `/onboarding/...` (não existe na Vercel).
 */
export function resolveUrlVideoBoasVindas(): string {
  const envOverride = String(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_VIDEO_BOAS_VINDAS : ''
  ).trim();

  if (envOverride) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!(isProd && isVideoArquivoLocal(envOverride))) {
      return envOverride;
    }
  }

  const supabaseUrl = String(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : ''
  ).trim();
  if (supabaseUrl) {
    return supabasePublicVideoUrl(supabaseUrl);
  }

  return VIDEO_BOAS_VINDAS_PATH_LOCAL;
}

/** @deprecated Preferir `resolveUrlVideoBoasVindas` ou GET `/api/portal/video-boas-vindas`. */
export function urlVideoBoasVindas(): string {
  return resolveUrlVideoBoasVindas();
}

export function isVideoSupabaseStorage(src: string): boolean {
  return src.includes('/storage/v1/object/public/') && src.includes(VIDEO_BOAS_VINDAS_STORAGE_BUCKET);
}
