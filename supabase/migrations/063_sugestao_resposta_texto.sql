-- Resposta personalizada da gestão (além dos botões de Grãos / marcar visto)
ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS resposta_texto TEXT,
  ADD COLUMN IF NOT EXISTS resposta_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS respondido_por_id UUID REFERENCES colaboradores(id);

COMMENT ON COLUMN sugestoes_reclamacoes.resposta_texto IS 'Mensagem da gestão visível ao autor no portal';
