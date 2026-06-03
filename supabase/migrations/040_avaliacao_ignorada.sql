-- Avaliação ignorada pelo admin (não entra em média, ranking nem bonificação; registro permanece)

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada_em TIMESTAMPTZ;

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada_por UUID REFERENCES colaboradores (id) ON DELETE SET NULL;

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada_motivo TEXT;

COMMENT ON COLUMN avaliacoes_diarias.ignorada IS
  'Quando true, a linha não entra em médias, ranking mural nem índice de bonificação.';

CREATE INDEX IF NOT EXISTS idx_avaliacoes_diarias_ignorada
  ON avaliacoes_diarias (ignorada)
  WHERE ignorada = true;

NOTIFY pgrst, 'reload schema';
