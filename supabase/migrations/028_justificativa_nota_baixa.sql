-- Justificativa obrigatória quando avaliação tiver nota baixa (3 ou menos).

ALTER TABLE IF EXISTS avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS justificativa_nota_baixa TEXT;

ALTER TABLE IF EXISTS avaliacoes_lideranca
  ADD COLUMN IF NOT EXISTS justificativa_nota_baixa TEXT;

COMMENT ON COLUMN avaliacoes_diarias.justificativa_nota_baixa IS
  'Motivo informado quando algum critério da avaliação diária recebe nota 3 ou menor.';

COMMENT ON COLUMN avaliacoes_lideranca.justificativa_nota_baixa IS
  'Motivo informado quando algum pilar da avaliação de liderança recebe nota 3 ou menor.';

NOTIFY pgrst, 'reload schema';
