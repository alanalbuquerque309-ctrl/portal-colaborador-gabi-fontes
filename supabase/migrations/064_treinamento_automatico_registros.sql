-- Registro de visualização/confirmação em treinos automáticos (Quinta colaborador, futuros textos por chave)

CREATE TABLE IF NOT EXISTS treinamento_automatico_registros (
  treino_chave TEXT NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  visualizado_em TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  PRIMARY KEY (treino_chave, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_treinamento_automatico_chave
  ON treinamento_automatico_registros(treino_chave);

CREATE INDEX IF NOT EXISTS idx_treinamento_automatico_colaborador
  ON treinamento_automatico_registros(colaborador_id);

ALTER TABLE treinamento_automatico_registros ENABLE ROW LEVEL SECURITY;

-- Materiais em texto no cadastro manual (além de vídeo YouTube)
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS tipo_conteudo TEXT NOT NULL DEFAULT 'video';
ALTER TABLE treinamentos ADD COLUMN IF NOT EXISTS conteudo_texto TEXT;
