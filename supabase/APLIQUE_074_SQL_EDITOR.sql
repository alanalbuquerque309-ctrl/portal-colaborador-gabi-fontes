-- Aplique no SQL Editor do Supabase (produção) se a migration automática não rodou.
-- 074 — data de retorno em férias/licença

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS data_retorno_previsto date;

COMMENT ON COLUMN avaliacoes_diarias.data_retorno_previsto IS
  'Retorno previsto (férias/licença). Colaborador some da lista até a semana seguinte a esta data.';

CREATE INDEX IF NOT EXISTS idx_avaliacoes_diarias_retorno_previsto
  ON avaliacoes_diarias (data_retorno_previsto)
  WHERE data_retorno_previsto IS NOT NULL;
