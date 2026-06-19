-- Permite tipo "elogio" em sugestoes_reclamacoes (além de sugestao e reclamacao).
-- Aplique no SQL Editor do Supabase se o insert de elogio falhar por CHECK constraint.

ALTER TABLE sugestoes_reclamacoes DROP CONSTRAINT IF EXISTS sugestoes_reclamacoes_tipo_check;
ALTER TABLE sugestoes_reclamacoes DROP CONSTRAINT IF EXISTS sugestoes_reclamacoes_tipo_chk;

ALTER TABLE sugestoes_reclamacoes
  ADD CONSTRAINT sugestoes_reclamacoes_tipo_check
  CHECK (tipo IN ('sugestao', 'reclamacao', 'elogio'));

-- Sugestões e elogios não devem ficar anônimos (só reclamação).
UPDATE sugestoes_reclamacoes SET anonimo = false WHERE tipo IN ('sugestao', 'elogio') AND anonimo = true;
