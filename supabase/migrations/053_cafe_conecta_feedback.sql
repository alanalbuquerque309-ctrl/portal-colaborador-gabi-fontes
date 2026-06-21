-- Café Conecta — feedback rápido pós-publicação (Fase 3)

CREATE TABLE IF NOT EXISTS cafe_conecta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteio_id UUID NOT NULL REFERENCES cafe_conecta_sorteios(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  reacao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sorteio_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_cafe_conecta_feedback_sorteio ON cafe_conecta_feedback (sorteio_id);
CREATE INDEX IF NOT EXISTS idx_cafe_conecta_feedback_reacao ON cafe_conecta_feedback (reacao);

COMMENT ON TABLE cafe_conecta_feedback IS 'Reações rápidas ao Café Conecta publicado (1 por colaborador/sorteio)';
