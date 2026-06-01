/** Título exibido no onboarding e na biblioteca do portal. */
export const VIDEO_BOAS_VINDAS_TITULO = 'Vídeo institucional de boas-vindas';

/** Caminho local padrão (arquivo em `public/onboarding/boas-vindas.mp4`). */
export const VIDEO_BOAS_VINDAS_PATH_LOCAL = '/onboarding/boas-vindas.mp4';

/**
 * URL do vídeo para o portal (onboarding e reassistência).
 * Prioridade: `NEXT_PUBLIC_VIDEO_BOAS_VINDAS` → arquivo local no portal.
 */
export function urlVideoBoasVindas(): string {
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_VIDEO_BOAS_VINDAS : undefined;
  const trimmed = String(env ?? '').trim();
  if (trimmed) return trimmed;
  return VIDEO_BOAS_VINDAS_PATH_LOCAL;
}
