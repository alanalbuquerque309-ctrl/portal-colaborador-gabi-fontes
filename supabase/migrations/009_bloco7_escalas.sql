-- Bloco 7: Minha escala — turnos dos colaboradores

CREATE TABLE IF NOT EXISTS escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_entrada TEXT NOT NULL,
  hora_saida TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(colaborador_id, data)
);

CREATE INDEX IF NOT EXISTS idx_escalas_colaborador ON escalas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_escalas_data ON escalas(data);
