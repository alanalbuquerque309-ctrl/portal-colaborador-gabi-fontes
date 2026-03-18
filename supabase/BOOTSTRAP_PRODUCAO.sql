-- Execute no Supabase: Dashboard → SQL Editor → New Query → Cole e Execute
-- Cria as tabelas mínimas para o login funcionar

-- 1. Tabela unidades
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Inserir as 4 unidades (ignora se já existir)
INSERT INTO unidades (nome, slug) VALUES
  ('Matriz (todas as lojas)', 'matriz'),
  ('Mesquita', 'mesquita'),
  ('Barra', 'barra'),
  ('Nova Iguaçu', 'nova-iguacu')
ON CONFLICT (slug) DO NOTHING;

-- 3. Tabela colaboradores (precisa existir para o login)
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  data_nascimento DATE,
  onboarding_completo BOOLEAN DEFAULT FALSE,
  termo_aceite_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Coluna role (se migrations 003 foram aplicadas, já existe)
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'colaborador';

-- 5. RLS: desativar para o service role funcionar (admin bypassa RLS)
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
