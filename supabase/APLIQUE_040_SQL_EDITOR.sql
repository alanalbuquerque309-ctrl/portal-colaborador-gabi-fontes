-- Cole no SQL Editor do Supabase (migration 040)

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada_em TIMESTAMPTZ;

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada_por UUID REFERENCES colaboradores (id) ON DELETE SET NULL;

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS ignorada_motivo TEXT;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_diarias_ignorada
  ON avaliacoes_diarias (ignorada)
  WHERE ignorada = true;
