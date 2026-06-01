-- Tipo de escala e parâmetros para geração do calendário (5x2, 6x1, 12x36).

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS tipo_escala TEXT;

ALTER TABLE colaboradores DROP CONSTRAINT IF EXISTS colaboradores_tipo_escala_check;
ALTER TABLE colaboradores ADD CONSTRAINT colaboradores_tipo_escala_check
  CHECK (tipo_escala IS NULL OR tipo_escala IN ('12x36', '6x1', '5x2'));

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS escala_folga_dias TEXT;

COMMENT ON COLUMN colaboradores.tipo_escala IS 'Regime: 12x36, 6x1 ou 5x2.';
COMMENT ON COLUMN colaboradores.escala_folga_dias IS 'Dias de folga na semana: dom, seg,ter, qua, qui, etc.';

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS escala_hora_entrada TEXT DEFAULT '08:00';
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS escala_hora_saida TEXT DEFAULT '17:00';

CREATE INDEX IF NOT EXISTS idx_colaboradores_tipo_escala ON colaboradores(tipo_escala);
