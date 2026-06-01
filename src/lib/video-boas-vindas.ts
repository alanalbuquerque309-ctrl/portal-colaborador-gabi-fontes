/** Título exibido no onboarding e na biblioteca do portal. */
export const VIDEO_BOAS_VINDAS_TITULO = 'Vídeo institucional de boas-vindas';

/** Caminho local (dev): `public/onboarding/boas-vindas.mp4` — não vai para a Vercel (gitignore). */
export const VIDEO_BOAS_VINDAS_PATH_LOCAL = '/onboarding/boas-vindas.mp4';

/** Bucket Supabase Storage (público) para o vídeo de onboarding. */
export const VIDEO_BOAS_VINDAS_STORAGE_BUCKET = 'portal-onboarding';
export const VIDEO_BOAS_VINDAS_STORAGE_OBJECT = 'boas-vindas.mp4';

function supabasePublicVideoUrl(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${VIDEO_BOAS_VINDAS_STORAGE_BUCKET}/${VIDEO_BOAS_VINDAS_STORAGE_OBJECT}`;
}

/**
 * URL do vídeo para o portal (onboarding e reassistência).
 * 1. `NEXT_PUBLIC_VIDEO_BOAS_VINDAS` (override explícito)
 * 2. Supabase Storage público (produção — após `npm run upload:video-boas-vindas`)
 * 3. Arquivo local `/onboarding/boas-vindas.mp4` (dev)
 */
export function urlVideoBoasVindas(): string {
  const envOverride =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_VIDEO_BOAS_VINDAS : undefined;
  const trimmed = String(envOverride ?? '').trim();
  if (trimmed) return trimmed;

  const supabaseUrl =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
  if (supabaseUrl?.trim()) {
    return supabasePublicVideoUrl(supabaseUrl.trim());
  }

  return VIDEO_BOAS_VINDAS_PATH_LOCAL;
}

export function isVideoArquivoLocal(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('//');
}

export function isVideoSupabaseStorage(src: string): boolean {
  return src.includes('/storage/v1/object/public/') && src.includes(VIDEO_BOAS_VINDAS_STORAGE_BUCKET);
}
