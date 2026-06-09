-- Balão de aniversário do dia: parabéns entre colegas e dispensar (OK) no 1º acesso

CREATE TABLE IF NOT EXISTS aniversario_dia_acao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  para_colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  data_ref DATE NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('parabens', 'dispensar')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aniversario_parabens_unico
  ON aniversario_dia_acao (colaborador_id, para_colaborador_id, data_ref)
  WHERE acao = 'parabens' AND para_colaborador_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_aniversario_dispensar_unico
  ON aniversario_dia_acao (colaborador_id, data_ref)
  WHERE acao = 'dispensar';

CREATE INDEX IF NOT EXISTS idx_aniversario_acao_data
  ON aniversario_dia_acao (data_ref, acao);

CREATE INDEX IF NOT EXISTS idx_aniversario_acao_para
  ON aniversario_dia_acao (para_colaborador_id, data_ref)
  WHERE acao = 'parabens';

ALTER TABLE aniversario_dia_acao ENABLE ROW LEVEL SECURITY;
