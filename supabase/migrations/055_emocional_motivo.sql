-- Termômetro: comentário opcional do colaborador (visível só gestão: admin, RH, sócios).

ALTER TABLE emocional_registro
  ADD COLUMN IF NOT EXISTS motivo TEXT;

COMMENT ON COLUMN emocional_registro.motivo IS
  'Texto opcional do colaborador ao registrar emoção; leitura restrita à gestão (admin, RH, sócios).';

NOTIFY pgrst, 'reload schema';
