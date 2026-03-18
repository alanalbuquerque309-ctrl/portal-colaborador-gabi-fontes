-- Bloco 8: Termômetro de emoções — registro diário
CREATE TABLE IF NOT EXISTS emocional_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  emocao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(colaborador_id, data)
);

CREATE INDEX IF NOT EXISTS idx_emocional_colaborador ON emocional_registro(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_emocional_data ON emocional_registro(data);

-- Bloco 9: Caixa de sugestões e reclamações
CREATE TABLE IF NOT EXISTS sugestoes_reclamacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  texto TEXT NOT NULL,
  anonimo BOOLEAN DEFAULT false,
  unidade_id UUID REFERENCES unidades(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sugestoes_tipo ON sugestoes_reclamacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_sugestoes_created ON sugestoes_reclamacoes(created_at DESC);
