-- CORREÇÃO: Adiciona colunas faltantes em colaboradores
-- Execute no Supabase: SQL Editor → New Query → Cole e Run

-- 1. Inserir Matriz em unidades (se não existir)
INSERT INTO unidades (nome, slug) VALUES ('Matriz (todas as lojas)', 'matriz')
ON CONFLICT (slug) DO NOTHING;

-- 2. Adicionar unidade_id (se não existir)
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id);

-- Preencher unidade_id em linhas que estiverem NULL
UPDATE colaboradores SET unidade_id = (SELECT id FROM unidades WHERE slug = 'matriz' LIMIT 1)
WHERE unidade_id IS NULL;

-- Tornar NOT NULL (falha se ainda houver NULL)
ALTER TABLE colaboradores ALTER COLUMN unidade_id SET NOT NULL;

-- 3. Adicionar onboarding_completo (se não existir)
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN DEFAULT FALSE;

-- 4. Adicionar role (se não existir)
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'colaborador';
