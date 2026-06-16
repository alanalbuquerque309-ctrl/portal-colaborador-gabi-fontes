-- Destaque de sugestão pela gestão (sócio/admin): +7 Grãos além dos 3 do envio.
ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_destaque_em TIMESTAMPTZ;

ALTER TABLE sugestoes_reclamacoes
  ADD COLUMN IF NOT EXISTS graos_destaque_por UUID REFERENCES colaboradores(id) ON DELETE SET NULL;

COMMENT ON COLUMN sugestoes_reclamacoes.graos_destaque_em IS 'Quando sócio/admin destacou: gostamos, vamos analisar (+7 Grãos)';
COMMENT ON COLUMN sugestoes_reclamacoes.graos_destaque_por IS 'Colaborador (sócio/admin) que destacou a sugestão';
