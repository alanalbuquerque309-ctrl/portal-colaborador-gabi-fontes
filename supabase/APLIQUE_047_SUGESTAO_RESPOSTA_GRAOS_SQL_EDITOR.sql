-- Cole no SQL Editor do Supabase (resposta variável 0/3/5/7 Grãos).

ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_resposta_bonus INTEGER;

UPDATE sugestoes_reclamacoes
SET graos_resposta_bonus = 7
WHERE graos_destaque_em IS NOT NULL AND graos_resposta_bonus IS NULL;
