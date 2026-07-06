-- Checklists operacionais diários (gerente). Uma linha por unidade + tipo + turno + dia da semana (1=seg … 7=dom).
-- Nova segunda substitui a anterior (UPSERT na mesma chave).

CREATE TABLE IF NOT EXISTS checklists_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (char_length(trim(tipo)) > 0),
  turno text NOT NULL CHECK (turno IN ('manha', 'tarde')),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  preenchido_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checklists_operacionais_uq UNIQUE (unidade_id, tipo, turno, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_checklists_oper_unidade ON checklists_operacionais (unidade_id);
CREATE INDEX IF NOT EXISTS idx_checklists_oper_tipo ON checklists_operacionais (tipo);
CREATE INDEX IF NOT EXISTS idx_checklists_oper_preenchido ON checklists_operacionais (preenchido_em DESC);

COMMENT ON TABLE checklists_operacionais IS 'Checklists de abertura/fechamento por loja; retenção lógica de 7 slots (dia da semana).';
COMMENT ON COLUMN checklists_operacionais.dia_semana IS '1=segunda … 7=domingo (America/Sao_Paulo no preenchimento).';
COMMENT ON COLUMN checklists_operacionais.respostas IS 'JSON: itens (id→bool), notas_secoes, campos extras (temperatura, setor).';

ALTER TABLE checklists_operacionais ENABLE ROW LEVEL SECURITY;
