-- Cole no Supabase → SQL Editor → Run (uma vez).

-- Corrige: nota_proatividade does not exist + edicao_utilizada + meio ponto.



-- 038 — edição única

ALTER TABLE IF EXISTS avaliacoes_diarias

  ADD COLUMN IF NOT EXISTS edicao_utilizada BOOLEAN NOT NULL DEFAULT FALSE;



COMMENT ON COLUMN avaliacoes_diarias.edicao_utilizada IS

  'True após o avaliador usar a única correção permitida na semana.';



-- 039 — proatividade + meio ponto

ALTER TABLE avaliacoes_diarias

  ADD COLUMN IF NOT EXISTS nota_proatividade NUMERIC(3, 1);



ALTER TABLE avaliacoes_diarias

  ALTER COLUMN nota_vestimenta TYPE NUMERIC(3, 1) USING nota_vestimenta::numeric(3, 1),

  ALTER COLUMN nota_pontualidade TYPE NUMERIC(3, 1) USING nota_pontualidade::numeric(3, 1),

  ALTER COLUMN nota_trabalho_equipe TYPE NUMERIC(3, 1) USING nota_trabalho_equipe::numeric(3, 1),

  ALTER COLUMN nota_desempenho_tarefas TYPE NUMERIC(3, 1) USING nota_desempenho_tarefas::numeric(3, 1);



COMMENT ON COLUMN avaliacoes_diarias.nota_proatividade IS

  'Proatividade e iniciativa (1–5 em meio ponto). Média semanal = média dos 5 critérios quando presente.';



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


