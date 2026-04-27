-- Expande avaliação de liderança para 5 pilares:
-- exemplo, comunicacao, suporte, justica e clima.

ALTER TABLE IF EXISTS avaliacoes_lideranca
  ADD COLUMN IF NOT EXISTS n_exemplo SMALLINT CHECK (n_exemplo >= 1 AND n_exemplo <= 5),
  ADD COLUMN IF NOT EXISTS n_comunicacao SMALLINT CHECK (n_comunicacao >= 1 AND n_comunicacao <= 5),
  ADD COLUMN IF NOT EXISTS n_suporte SMALLINT CHECK (n_suporte >= 1 AND n_suporte <= 5),
  ADD COLUMN IF NOT EXISTS n_justica SMALLINT CHECK (n_justica >= 1 AND n_justica <= 5),
  ADD COLUMN IF NOT EXISTS n_clima SMALLINT CHECK (n_clima >= 1 AND n_clima <= 5);

-- Backfill inicial usando colunas legadas quando existirem.
UPDATE avaliacoes_lideranca
SET
  n_exemplo = COALESCE(n_exemplo, n_organizacao, 3),
  n_comunicacao = COALESCE(n_comunicacao, n_fala_escuta, 3),
  n_suporte = COALESCE(n_suporte, n_apoio, 3),
  n_justica = COALESCE(n_justica, n_organizacao, 3),
  n_clima = COALESCE(n_clima, n_ambiente, 3);

ALTER TABLE IF EXISTS avaliacoes_lideranca
  ALTER COLUMN n_exemplo SET NOT NULL,
  ALTER COLUMN n_comunicacao SET NOT NULL,
  ALTER COLUMN n_suporte SET NOT NULL,
  ALTER COLUMN n_justica SET NOT NULL,
  ALTER COLUMN n_clima SET NOT NULL;
