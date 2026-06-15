-- 042: Paridade do plantão 12x36 amarrada à FUNÇÃO de liderança (lideres_por_setor).
-- A paridade segue a linha (unidade + setor + função), não a pessoa: trocar o líder
-- (lider_id) mantém a configuração. Inverte automaticamente a cada mês (calculado no app).

ALTER TABLE lideres_por_setor
  ADD COLUMN IF NOT EXISTS plantao_paridade text,
  ADD COLUMN IF NOT EXISTS plantao_paridade_mes_ref text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'lideres_por_setor' AND constraint_name = 'lideres_por_setor_plantao_paridade_chk'
  ) THEN
    ALTER TABLE lideres_por_setor
      ADD CONSTRAINT lideres_por_setor_plantao_paridade_chk
      CHECK (plantao_paridade IS NULL OR plantao_paridade IN ('par', 'impar'));
  END IF;
END $$;

COMMENT ON COLUMN lideres_por_setor.plantao_paridade IS
  'Plantao 12x36: paridade dos dias (par/impar) que esta funcao cobre no mes de referencia. Inverte a cada mes.';
COMMENT ON COLUMN lideres_por_setor.plantao_paridade_mes_ref IS
  'Mes-base YYYY-MM em que plantao_paridade foi definido; usado para calcular a inversao mensal.';
