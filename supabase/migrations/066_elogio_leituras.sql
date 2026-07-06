-- Leitura de elogio por colaborador (some só para quem marcou "lido").
CREATE TABLE IF NOT EXISTS elogio_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sugestao_id uuid NOT NULL REFERENCES sugestoes_reclamacoes(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  lido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sugestao_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_elogio_leituras_colaborador ON elogio_leituras(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_elogio_leituras_sugestao ON elogio_leituras(sugestao_id);
