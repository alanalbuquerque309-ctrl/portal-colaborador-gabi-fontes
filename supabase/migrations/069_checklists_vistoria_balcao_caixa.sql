-- Inclui balcão e caixa na vistoria de setores (instalações que já rodaram 068 com 3 setores).

ALTER TABLE checklists_vistoria_gerencia DROP CONSTRAINT IF EXISTS checklists_vistoria_gerencia_setor_check;
ALTER TABLE checklists_vistoria_gerencia ADD CONSTRAINT checklists_vistoria_gerencia_setor_check
  CHECK (setor IN ('estoque', 'asg', 'cozinha', 'balcao', 'caixa'));
