-- Avaliação diária (Master) + vínculo líder → equipe
-- Rode no SQL Editor da Supabase ou via supabase db push

ALTER TABLE colaboradores
  ADD COLUMN IF NOT EXISTS lider_id UUID REFERENCES colaboradores (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_colaboradores_lider_id ON colaboradores (lider_id);

COMMENT ON COLUMN colaboradores.lider_id IS 'Líder direto (Master) para listagem em Avaliação Master';

CREATE TABLE IF NOT EXISTS avaliacoes_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  colaborador_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  data_referencia DATE NOT NULL,
  assiduidade TEXT NOT NULL CHECK (
    assiduidade IN ('presente', 'falta_justificada', 'falta_injustificada')
  ),
  nota_vestimenta SMALLINT CHECK (nota_vestimenta IS NULL OR (nota_vestimenta >= 0 AND nota_vestimenta <= 5)),
  nota_pontualidade SMALLINT CHECK (nota_pontualidade IS NULL OR (nota_pontualidade >= 0 AND nota_pontualidade <= 5)),
  nota_trabalho_equipe SMALLINT CHECK (nota_trabalho_equipe IS NULL OR (nota_trabalho_equipe >= 0 AND nota_trabalho_equipe <= 5)),
  nota_desempenho_tarefas SMALLINT CHECK (
    nota_desempenho_tarefas IS NULL OR (nota_desempenho_tarefas >= 0 AND nota_desempenho_tarefas <= 5)
  ),
  media_dia NUMERIC(4, 2) CHECK (media_dia IS NULL OR (media_dia >= 0 AND media_dia <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT avaliacoes_diarias_uq_dia UNIQUE (colaborador_id, avaliador_id, data_referencia),
  CONSTRAINT avaliacoes_diarias_sem_auto_avaliacao CHECK (colaborador_id <> avaliador_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_diarias_colaborador_data ON avaliacoes_diarias (colaborador_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_diarias_avaliador_data ON avaliacoes_diarias (avaliador_id, data_referencia);

CREATE OR REPLACE FUNCTION avaliacoes_diarias_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_avaliacoes_diarias_updated ON avaliacoes_diarias;
CREATE TRIGGER trg_avaliacoes_diarias_updated
  BEFORE UPDATE ON avaliacoes_diarias
  FOR EACH ROW
  EXECUTE PROCEDURE avaliacoes_diarias_set_updated_at();

NOTIFY pgrst, 'reload schema';
