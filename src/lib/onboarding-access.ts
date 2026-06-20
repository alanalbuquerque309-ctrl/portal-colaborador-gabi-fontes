import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Todos os cargos, exceto sócio, passam pelo onboarding (vídeo institucional, quizzes, manuais).
 * Sócios têm acesso direto desde o primeiro login.
 */
export function roleExigeOnboarding(role: string | null | undefined): boolean {
  return normalizePortalRole(role) !== 'socio';
}

export const PAYLOAD_ONBOARDING_GESTAO_COMPLETO = {
  onboarding_completo: true,
  onboarding_video_visto: true,
  onboarding_quiz_video_ok: true,
  onboarding_manual_geral_lido_ok: true,
  onboarding_quiz_manual_geral_ok: true,
  onboarding_manual_escolhido_concluido: true,
  updated_at: new Date().toISOString(),
} as const;

/** Sócios, admin, gerentes etc.: marca onboarding concluído no banco se ainda estiver pendente. */
export async function sincronizarOnboardingGestaoNoBanco(
  supabase: SupabaseClient,
  colaboradorId: string,
  role: string | null | undefined,
  onboardingCompleto: boolean | null | undefined
): Promise<boolean> {
  if (onboardingCompleto === true) return true;
  if (roleExigeOnboarding(role)) return false;

  const { error } = await supabase
    .from('colaboradores')
    .update({ ...PAYLOAD_ONBOARDING_GESTAO_COMPLETO })
    .eq('id', colaboradorId);

  if (error) throw new Error(error.message);
  return true;
}
