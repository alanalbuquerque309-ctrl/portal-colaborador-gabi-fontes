-- Vistoria da gerência: conferência diária dos checklists dos setores (Mesquita piloto).

CREATE TABLE IF NOT EXISTS checklists_vistoria_gerencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id uuid NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  setor text NOT NULL CHECK (setor IN ('estoque', 'asg', 'cozinha', 'balcao', 'caixa')),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('conferido', 'pendente', 'nao_preenchido')),
  checklist_operacional_id uuid REFERENCES checklists_operacionais(id) ON DELETE SET NULL,
  observacoes text,
  vistoriado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checklists_vistoria_gerencia_uq UNIQUE (unidade_id, setor, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_checklists_vistoria_unidade ON checklists_vistoria_gerencia (unidade_id);
CREATE INDEX IF NOT EXISTS idx_checklists_vistoria_dia ON checklists_vistoria_gerencia (dia_semana);

COMMENT ON TABLE checklists_vistoria_gerencia IS 'Gerência confere se setores preencheram o checklist do dia (Mesquita piloto).';
