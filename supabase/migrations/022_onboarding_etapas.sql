-- Etapas do primeiro acesso (vídeo, quizzes, manuais) persistidas no servidor.

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_video_visto BOOLEAN DEFAULT FALSE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_quiz_video_ok BOOLEAN DEFAULT FALSE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_manual_geral_lido_ok BOOLEAN DEFAULT FALSE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_quiz_manual_geral_ok BOOLEAN DEFAULT FALSE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_manual_escolhido_file TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_manual_escolhido_concluido BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN colaboradores.onboarding_manual_escolhido_file IS 'Ficheiro HTML do manual confirmado como "meu manual" após o primeiro acesso.';
