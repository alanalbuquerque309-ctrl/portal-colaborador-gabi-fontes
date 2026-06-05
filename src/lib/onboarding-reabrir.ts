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

/** Reset completo de primeiro acesso (senha + onboarding + perfil pessoal). Mantém CPF, nome, e-mail, telefone, role, unidade. */
export function payloadResetPrimeiroAcesso(): Record<string, unknown> {
  return {
    senha_hash: null,
    forca_troca_senha: false,
    onboarding_completo: false,
    onboarding_video_visto: false,
    onboarding_quiz_video_ok: false,
    onboarding_manual_geral_lido_ok: false,
    onboarding_quiz_manual_geral_ok: false,
    onboarding_manual_escolhido_concluido: false,
    onboarding_manual_escolhido_file: null,
    data_nascimento: null,
    endereco: null,
    foto_url: null,
    updated_at: new Date().toISOString(),
  };
}

export function urlOnboardingColaborador(colaboradorId: string, unidadeId: string): string {
  const p = new URLSearchParams({
    colaborador_id: colaboradorId,
    unidade_id: unidadeId,
  });
  return `/onboarding?${p.toString()}`;
}
