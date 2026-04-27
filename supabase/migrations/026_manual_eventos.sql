-- Registos de eventos de segurança durante leitura de manuais.
-- Observação: é detecção de tentativa (atalho/print), não bloqueio nem prova absoluta.

CREATE TABLE IF NOT EXISTS manual_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  manual_path TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_eventos_created_at ON manual_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_eventos_colaborador_id ON manual_eventos(colaborador_id);
