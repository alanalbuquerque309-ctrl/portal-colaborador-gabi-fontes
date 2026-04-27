-- Vínculo N:N entre colaborador e líderes.
-- Mantém colaboradores.lider_id como compatibilidade, mas a fonte principal passa a ser esta tabela.

CREATE TABLE IF NOT EXISTS colaboradores_lideres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  lider_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT colaboradores_lideres_sem_auto_lider CHECK (colaborador_id <> lider_id),
  CONSTRAINT colaboradores_lideres_unico UNIQUE (colaborador_id, lider_id)
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_lideres_colaborador
  ON colaboradores_lideres (colaborador_id)
  WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_colaboradores_lideres_lider
  ON colaboradores_lideres (lider_id)
  WHERE ativo = TRUE;

INSERT INTO colaboradores_lideres (colaborador_id, lider_id, ativo)
SELECT id, lider_id, TRUE
FROM colaboradores
WHERE lider_id IS NOT NULL
ON CONFLICT (colaborador_id, lider_id)
DO UPDATE SET ativo = TRUE, updated_at = NOW();

CREATE OR REPLACE FUNCTION colaboradores_lideres_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_colaboradores_lideres_updated ON colaboradores_lideres;
CREATE TRIGGER trg_colaboradores_lideres_updated
  BEFORE UPDATE ON colaboradores_lideres
  FOR EACH ROW
  EXECUTE PROCEDURE colaboradores_lideres_set_updated_at();

COMMENT ON TABLE colaboradores_lideres IS
  'Relação de múltiplos líderes por colaborador, usada por escalas alternadas e avaliações.';

COMMENT ON COLUMN colaboradores_lideres.ativo IS
  'Permite manter histórico do vínculo sem apagar a relação lógica.';

NOTIFY pgrst, 'reload schema';
