-- 061 — Fundação SaaS: espelho de tenant (branding, termos, setores).
-- NÃO altera a fonte da verdade em runtime: o app continua usando constantes/env
-- até USE_TENANT_DB=true. Esta migration só prepara o banco e espelha o catálogo Gabi Fontes.

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome_exibicao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  termos JSONB NOT NULL DEFAULT '{}'::jsonb,
  modulos JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_tenant_setores_tenant_ordem
  ON tenant_setores (tenant_id, ordem)
  WHERE ativo = TRUE;

COMMENT ON TABLE tenants IS 'Clientes da plataforma (espelho SaaS). Runtime legado ignora até USE_TENANT_DB.';
COMMENT ON TABLE tenant_settings IS 'Branding, termos e módulos por tenant (JSON).';
COMMENT ON TABLE tenant_setores IS 'Catálogo de setores por tenant (espelho; fonte da verdade ainda no código).';

-- Tenant legado #1
INSERT INTO tenants (slug, nome_exibicao)
VALUES ('gabi-fontes', 'Gabi Fontes')
ON CONFLICT (slug) DO UPDATE SET nome_exibicao = EXCLUDED.nome_exibicao, updated_at = now();

INSERT INTO tenant_settings (tenant_id, branding, termos, modulos)
SELECT
  t.id,
  jsonb_build_object(
    'displayName', 'Gabi Fontes',
    'tagline', 'Cafeteria Gabi Fontes',
    'portalTitle', 'Portal do Colaborador',
    'logoUrl', '/logo-gabi-fontes.png',
    'logoUrlHome', '/manuais/assets/logo-gabi-fontes-transparent.png',
    'logoAlt', 'Gabi Fontes — Cafeteria & Doceria',
    'pwaShortName', 'Portal GF',
    'themeColor', '#FFFFFF',
    'metaDescription', 'Cultura e Comunicação Interna - Gabi Fontes'
  ),
  jsonb_build_object(
    'reconhecimento', 'Grãos de café',
    'cafe_conecta', 'Café Conecta',
    'quinta_treino', 'Quinta do café'
  ),
  jsonb_build_object(
    'graos', true,
    'cafe_conecta', true,
    'quinta_treino', true,
    'trofeus_pares', true,
    'termometro_emocional', true,
    'avaliacao_equipe', true,
    'feedback_lideranca', true,
    'escalas', true,
    'gorjeta', true
  )
FROM tenants t
WHERE t.slug = 'gabi-fontes'
ON CONFLICT (tenant_id) DO UPDATE SET
  branding = EXCLUDED.branding,
  termos = EXCLUDED.termos,
  modulos = EXCLUDED.modulos,
  updated_at = now();

-- Espelho dos setores predefinidos (mesma ordem do código)
INSERT INTO tenant_setores (tenant_id, nome, ordem, ativo)
SELECT t.id, v.nome, v.ordem, TRUE
FROM tenants t
CROSS JOIN (
  VALUES
    ('Cozinha loja', 1),
    ('Atendimento', 2),
    ('Copa', 3),
    ('Caixa', 4),
    ('ASG', 5),
    ('Fábrica de doces', 6),
    ('Fábrica de preparos', 7),
    ('Administração', 8),
    ('Escritório', 9),
    ('CD', 10),
    ('Motorista', 11),
    ('RH', 12),
    ('Supervisão', 13),
    ('Marketing', 14)
) AS v(nome, ordem)
WHERE t.slug = 'gabi-fontes'
ON CONFLICT (tenant_id, nome) DO UPDATE SET ordem = EXCLUDED.ordem, ativo = TRUE;
