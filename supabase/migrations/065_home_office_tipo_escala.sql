-- Home office: fora da avaliação semanal de equipe e de Grãos de café.

ALTER TABLE colaboradores DROP CONSTRAINT IF EXISTS colaboradores_tipo_escala_check;
ALTER TABLE colaboradores ADD CONSTRAINT colaboradores_tipo_escala_check
  CHECK (tipo_escala IS NULL OR tipo_escala IN ('12x36', '6x1', '5x2', 'home_office'));

COMMENT ON COLUMN colaboradores.tipo_escala IS 'Regime: 12x36, 6x1, 5x2 ou home_office (remoto, sem avaliação semanal nem Grãos).';

UPDATE colaboradores
SET tipo_escala = 'home_office'
WHERE id = '073a6d3c-ddd0-4823-ac8a-1e99b037607a';

NOTIFY pgrst, 'reload schema';
