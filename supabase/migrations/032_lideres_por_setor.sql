-- Liderança por unidade + setor: N líderes por par (unidade, setor).
-- Equipe e vínculos derivados em runtime via listarEquipeDoLider / listarLideresDoColaborador.

CREATE TABLE IF NOT EXISTS lideres_por_setor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades (id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  lider_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lideres_por_setor_sem_auto_lider CHECK (lider_id IS NOT NULL),
  CONSTRAINT lideres_por_setor_unico UNIQUE (unidade_id, setor, lider_id)
);

CREATE INDEX IF NOT EXISTS idx_lideres_por_setor_unidade_setor
  ON lideres_por_setor (unidade_id, setor)
  WHERE ativo = TRUE;

CREATE INDEX IF NOT EXISTS idx_lideres_por_setor_lider
  ON lideres_por_setor (lider_id)
  WHERE ativo = TRUE;

CREATE OR REPLACE FUNCTION lideres_por_setor_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lideres_por_setor_updated ON lideres_por_setor;
CREATE TRIGGER trg_lideres_por_setor_updated
  BEFORE UPDATE ON lideres_por_setor
  FOR EACH ROW
  EXECUTE PROCEDURE lideres_por_setor_set_updated_at();

COMMENT ON TABLE lideres_por_setor IS
  'Config: quem lidera cada setor em cada unidade. Colaboradores com mesmo unidade+setor herdam esses líderes automaticamente.';
