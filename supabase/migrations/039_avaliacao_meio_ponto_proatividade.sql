-- Notas em meio ponto (1 a 5, passo 0,5) + 5º critério universal (proatividade).
-- Presença não entra na média; assiduidade continua à parte (folga / falta / presente).

ALTER TABLE avaliacoes_diarias
  ADD COLUMN IF NOT EXISTS nota_proatividade NUMERIC(3, 1);

ALTER TABLE avaliacoes_diarias
  ALTER COLUMN nota_vestimenta TYPE NUMERIC(3, 1) USING nota_vestimenta::numeric(3, 1),
  ALTER COLUMN nota_pontualidade TYPE NUMERIC(3, 1) USING nota_pontualidade::numeric(3, 1),
  ALTER COLUMN nota_trabalho_equipe TYPE NUMERIC(3, 1) USING nota_trabalho_equipe::numeric(3, 1),
  ALTER COLUMN nota_desempenho_tarefas TYPE NUMERIC(3, 1) USING nota_desempenho_tarefas::numeric(3, 1);

COMMENT ON COLUMN avaliacoes_diarias.nota_proatividade IS
  'Proatividade e iniciativa (1–5 em meio ponto). Média semanal = média dos 5 critérios quando presente.';

-- Se 039 anterior criou nota_atendimento por engano, renomeia.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'avaliacoes_diarias' AND column_name = 'nota_atendimento'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'avaliacoes_diarias' AND column_name = 'nota_proatividade'
  ) THEN
    ALTER TABLE avaliacoes_diarias RENAME COLUMN nota_atendimento TO nota_proatividade;
  END IF;
END $$;

UPDATE avaliacoes_diarias
SET
  media_dia = ROUND(
    (
      COALESCE(nota_vestimenta, 0) + COALESCE(nota_pontualidade, 0) + COALESCE(nota_trabalho_equipe, 0)
      + COALESCE(nota_desempenho_tarefas, 0)
    )::numeric
      / 4.0,
    2
  )
WHERE
  assiduidade = 'presente'
  AND nota_proatividade IS NULL
  AND nota_vestimenta IS NOT NULL
  AND nota_pontualidade IS NOT NULL
  AND nota_trabalho_equipe IS NOT NULL
  AND nota_desempenho_tarefas IS NOT NULL;

NOTIFY pgrst, 'reload schema';
