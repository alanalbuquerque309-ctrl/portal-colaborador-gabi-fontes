-- Cole no SQL Editor do Supabase (migration 045)
ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_destaque_em TIMESTAMPTZ;

ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_destaque_por UUID REFERENCES colaboradores(id) ON DELETE SET NULL;
