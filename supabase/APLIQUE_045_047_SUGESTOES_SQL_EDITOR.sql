-- Cole no SQL Editor do Supabase (migrations 045 + 046 + 047 — sugestões admin)
-- Ordem: 045 → 046 → 047

-- ========== 045 — destaque Grãos em sugestões ==========
ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_destaque_em TIMESTAMPTZ;

ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_destaque_por UUID REFERENCES colaboradores(id) ON DELETE SET NULL;

COMMENT ON COLUMN sugestoes_reclamacoes.graos_destaque_em IS 'Quando sócio/admin destacou: gostamos, vamos analisar (+7 Grãos legado)';
COMMENT ON COLUMN sugestoes_reclamacoes.graos_destaque_por IS 'Colaborador (sócio/admin) que destacou a sugestão';

-- ========== 046 — tipo elogio ==========
ALTER TABLE sugestoes_reclamacoes DROP CONSTRAINT IF EXISTS sugestoes_reclamacoes_tipo_check;
ALTER TABLE sugestoes_reclamacoes DROP CONSTRAINT IF EXISTS sugestoes_reclamacoes_tipo_chk;

ALTER TABLE sugestoes_reclamacoes
  ADD CONSTRAINT sugestoes_reclamacoes_tipo_check
  CHECK (tipo IN ('sugestao', 'reclamacao', 'elogio'));

UPDATE sugestoes_reclamacoes SET anonimo = false WHERE tipo IN ('sugestao', 'elogio') AND anonimo = true;

-- ========== 047 — resposta variável Grãos (0/3/5/7) ==========
ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_resposta_bonus INTEGER;

COMMENT ON COLUMN sugestoes_reclamacoes.graos_resposta_bonus IS
  'Grãos extras creditados na resposta da gestão (0, 3, 5 ou 7). NULL = ainda não respondido.';

UPDATE sugestoes_reclamacoes
SET graos_resposta_bonus = 7
WHERE graos_destaque_em IS NOT NULL AND graos_resposta_bonus IS NULL;

-- ========== (opcional) 015 — se visualizado_em / curtidas ainda não existirem ==========
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS visualizado_em TIMESTAMPTZ;
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS curtidas INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sugestao_curtidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sugestao_id UUID NOT NULL REFERENCES sugestoes_reclamacoes(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sugestao_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_sugestao_curtidas_sugestao ON sugestao_curtidas(sugestao_id);
