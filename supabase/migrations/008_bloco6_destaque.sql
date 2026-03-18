-- Bloco 6: Mural social — Colaborador em Destaque
-- Uma linha ativa por vez; admin define quem está em destaque

CREATE TABLE IF NOT EXISTS destaque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destaque_created ON destaque(created_at DESC);
