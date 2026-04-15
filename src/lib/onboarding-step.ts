/** Índices alinhados a `ETAPAS_ONBOARDING` em OnboardingFlow.tsx */
export function inferOnboardingEtapaIndex(o: {
  onboarding_video_visto?: boolean | null;
  onboarding_quiz_video_ok?: boolean | null;
  onboarding_manual_geral_lido_ok?: boolean | null;
  onboarding_quiz_manual_geral_ok?: boolean | null;
  onboarding_manual_escolhido_concluido?: boolean | null;
}): number {
  if (!o.onboarding_video_visto) return 0;
  if (!o.onboarding_quiz_video_ok) return 1;
  if (!o.onboarding_manual_geral_lido_ok) return 2;
  if (!o.onboarding_quiz_manual_geral_ok) return 3;
  if (!o.onboarding_manual_escolhido_concluido) return 4;
  return 5;
}
