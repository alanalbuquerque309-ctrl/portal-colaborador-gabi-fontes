/** Título exibido no onboarding e na biblioteca do portal. */
export const VIDEO_BOAS_VINDAS_TITULO = 'Vídeo institucional de boas-vindas';

/** Caminho local (dev): `public/onboarding/boas-vindas.mp4` — não existe na Vercel. */
export const VIDEO_BOAS_VINDAS_PATH_LOCAL = '/onboarding/boas-vindas.mp4';

/** Bucket Supabase Storage (público) para o vídeo de onboarding. */
export const VIDEO_BOAS_VINDAS_STORAGE_BUCKET = 'portal-onboarding';
export const VIDEO_BOAS_VINDAS_STORAGE_OBJECT = 'boas-vindas.mp4';

/** Projeto Supabase do portal — fallback se a env não estiver disponível em runtime. */
const SUPABASE_URL_FALLBACK = 'https://fxopbgjallrweshdehbn.supabase.co';

export function isVideoArquivoLocal(src: string): boolean {
  const s = src.trim();
  return s.startsWith('/') && !s.startsWith('//');
}

/** Descarta valores inúteis vindos de env mal configurada (texto "undefined", "null", vazio). */
function envLimpo(valor: string | undefined | null): string {
  const v = String(valor ?? '').trim();
  if (!v || v.toLowerCase() === 'undefined' || v.toLowerCase() === 'null') return '';
  return v;
}

function supabasePublicVideoUrl(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${VIDEO_BOAS_VINDAS_STORAGE_BUCKET}/${VIDEO_BOAS_VINDAS_STORAGE_OBJECT}`;
}

/**
 * URL efetiva do vídeo (servidor ou build).
 * Só aceita override http(s) explícito; nunca devolve caminho local em produção.
 */
export function resolveUrlVideoBoasVindas(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const envOverride = envLimpo(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_VIDEO_BOAS_VINDAS : ''
  );

  if (/^https?:\/\//i.test(envOverride)) {
    return envOverride;
  }
  if (envOverride && !isProd && isVideoArquivoLocal(envOverride)) {
    return envOverride;
  }

  const supabaseUrl =
    envLimpo(typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') ||
    SUPABASE_URL_FALLBACK;
  return supabasePublicVideoUrl(supabaseUrl);
}

/** @deprecated Preferir `resolveUrlVideoBoasVindas` ou GET `/api/portal/video-boas-vindas`. */
export function urlVideoBoasVindas(): string {
  return resolveUrlVideoBoasVindas();
}

export function isVideoSupabaseStorage(src: string): boolean {
  return src.includes('/storage/v1/object/public/') && src.includes(VIDEO_BOAS_VINDAS_STORAGE_BUCKET);
}
