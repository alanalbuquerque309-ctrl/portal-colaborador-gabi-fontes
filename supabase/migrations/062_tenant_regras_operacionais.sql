-- 062 — Espelho SaaS: regras operacionais por nome (liderança + avaliação direta).
-- NÃO altera runtime sem USE_TENANT_DB=true. Popular com npm run db:espelhar-regras-062

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS regras_lideranca JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS regras_avaliacao_direta JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenant_settings.regras_lideranca IS
  'Espelho JSON das regras REGRAS_LIDERANCA_OPERACIONAL (por tenant).';
COMMENT ON COLUMN tenant_settings.regras_avaliacao_direta IS
  'Espelho JSON das regras REGRAS_AVALIACAO_DIRETA (por tenant).';
