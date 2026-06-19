-- Resposta da gestão com bônus variável (0, 3, 5 ou 7 Grãos).
ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_resposta_bonus INTEGER;

COMMENT ON COLUMN sugestoes_reclamacoes.graos_resposta_bonus IS
  'Grãos extras creditados na resposta da gestão (0, 3, 5 ou 7). NULL = ainda não respondido.';

-- Destaques antigos (+7 fixo) viram resposta explícita.
UPDATE sugestoes_reclamacoes
SET graos_resposta_bonus = 7
WHERE graos_destaque_em IS NOT NULL AND graos_resposta_bonus IS NULL;
