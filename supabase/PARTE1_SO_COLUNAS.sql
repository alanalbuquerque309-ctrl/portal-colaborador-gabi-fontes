ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS graos_destaque_em TIMESTAMPTZ;
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS graos_destaque_por UUID REFERENCES colaboradores(id) ON DELETE SET NULL;
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS graos_resposta_bonus INTEGER;
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS visualizado_em TIMESTAMPTZ;
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS curtidas INTEGER NOT NULL DEFAULT 0;
