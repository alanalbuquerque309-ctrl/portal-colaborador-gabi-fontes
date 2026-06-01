-- Quem da gestão já viu o alerta do termômetro (por colaborador e dia).
CREATE TABLE IF NOT EXISTS emocional_alertas_vistos (
  viewer_colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  visto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_colaborador_id, colaborador_id, data)
);

CREATE INDEX IF NOT EXISTS idx_emocional_alertas_vistos_data
  ON emocional_alertas_vistos (viewer_colaborador_id, data);
