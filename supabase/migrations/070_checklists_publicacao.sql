-- Publicação de checklists: rascunho (salvar) vs visível no portal (publicar).

ALTER TABLE checklists_operacionais
  ADD COLUMN IF NOT EXISTS publicado_em timestamptz,
  ADD COLUMN IF NOT EXISTS publicado_por_id uuid REFERENCES colaboradores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checklists_oper_publicado
  ON checklists_operacionais (unidade_id, tipo, publicado_em DESC NULLS LAST);

COMMENT ON COLUMN checklists_operacionais.publicado_em IS 'Quando preenchido, o checklist fica visível no portal até nova publicação.';
COMMENT ON COLUMN checklists_operacionais.publicado_por_id IS 'Colaborador que publicou (gerente, RH, admin ou sócio).';
