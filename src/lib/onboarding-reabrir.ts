/** Campos zerados ao reabrir o primeiro acesso (mantém senha, CPF, perfil, etc.). */
export const PAYLOAD_REABRIR_ONBOARDING = {
  onboarding_completo: false,
  onboarding_video_visto: false,
  onboarding_quiz_video_ok: false,
  onboarding_manual_geral_lido_ok: false,
  onboarding_quiz_manual_geral_ok: false,
  onboarding_manual_escolhido_concluido: false,
  onboarding_manual_escolhido_file: null,
  updated_at: new Date().toISOString(),
} as const;

export function urlOnboardingColaborador(colaboradorId: string, unidadeId: string): string {
  const p = new URLSearchParams({
    colaborador_id: colaboradorId,
    unidade_id: unidadeId,
  });
  return `/onboarding?${p.toString()}`;
}
