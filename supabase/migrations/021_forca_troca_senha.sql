-- Obrigar troca da senha padrão (123456) no primeiro login com hash já definido.

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS forca_troca_senha BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN colaboradores.forca_troca_senha IS 'Se true, o portal exige trocar a senha antes de continuar.';

CREATE INDEX IF NOT EXISTS idx_colaboradores_forca_troca ON colaboradores (forca_troca_senha) WHERE forca_troca_senha = TRUE;
