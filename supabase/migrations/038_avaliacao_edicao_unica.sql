-- Edição única da avaliação semanal pelo próprio avaliador (gerente/líder).

ALTER TABLE IF EXISTS avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS edicao_utilizada BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN avaliacoes_diarias.edicao_utilizada IS
  'True após o avaliador usar a única correção permitida na semana.';

NOTIFY pgrst, 'reload schema';
