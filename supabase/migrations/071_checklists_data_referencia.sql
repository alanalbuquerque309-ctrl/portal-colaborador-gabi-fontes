-- Checklists por data civil (America/Sao_Paulo), janela rolante de 7 dias.
-- Antes: UNIQUE (unidade, tipo, turno, dia_semana) — a mesma segunda da semana seguinte
-- sobrescrevia a anterior e o painel “publicado” do dia anterior parecia travar o dia seguinte.
-- Agora: UNIQUE (unidade, tipo, turno, data_referencia); dias antigos são apagados ao gravar.

ALTER TABLE checklists_operacionais
  ADD COLUMN IF NOT EXISTS data_referencia date;

-- Backfill: data do preenchimento no fuso da operação.
UPDATE checklists_operacionais
SET data_referencia = (timezone('America/Sao_Paulo', preenchido_em))::date
WHERE data_referencia IS NULL;

-- Se ainda houver NULL (linha sem preenchido_em inválido), usa updated_at.
UPDATE checklists_operacionais
SET data_referencia = (timezone('America/Sao_Paulo', updated_at))::date
WHERE data_referencia IS NULL;

-- Remove duplicatas após backfill (mantém o updated_at mais recente).
DELETE FROM checklists_operacionais a
USING checklists_operacionais b
WHERE a.data_referencia IS NOT NULL
  AND b.data_referencia IS NOT NULL
  AND a.unidade_id = b.unidade_id
  AND a.tipo = b.tipo
  AND a.turno = b.turno
  AND a.data_referencia = b.data_referencia
  AND (
    a.updated_at < b.updated_at
    OR (a.updated_at = b.updated_at AND a.id < b.id)
  );

ALTER TABLE checklists_operacionais
  ALTER COLUMN data_referencia SET NOT NULL;

ALTER TABLE checklists_operacionais
  DROP CONSTRAINT IF EXISTS checklists_operacionais_uq;

ALTER TABLE checklists_operacionais
  ADD CONSTRAINT checklists_operacionais_uq UNIQUE (unidade_id, tipo, turno, data_referencia);

-- Mantém dia_semana alinhado à data (1=seg … 7=dom).
UPDATE checklists_operacionais
SET dia_semana = CASE EXTRACT(ISODOW FROM data_referencia)::int
  WHEN 1 THEN 1
  WHEN 2 THEN 2
  WHEN 3 THEN 3
  WHEN 4 THEN 4
  WHEN 5 THEN 5
  WHEN 6 THEN 6
  WHEN 7 THEN 7
  ELSE dia_semana
END;

CREATE INDEX IF NOT EXISTS idx_checklists_oper_data_ref
  ON checklists_operacionais (unidade_id, tipo, data_referencia DESC);

COMMENT ON COLUMN checklists_operacionais.data_referencia IS
  'Data civil do checklist (YYYY-MM-DD, America/Sao_Paulo). Retenção: últimos 7 dias; o 8º apaga o mais antigo.';
