-- SCHEMA COMPLETO: colaboradores — evita erros "column not found in schema cache"
-- Execute no Supabase SQL Editor. Inclui TODAS as colunas usadas pelo app.

-- 1. Unidades: garante Matriz
INSERT INTO unidades (nome, slug) VALUES ('Matriz (todas as lojas)', 'matriz')
ON CONFLICT (slug) DO NOTHING;

-- 2. Colaboradores: TODAS as colunas possivelmente usadas
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS termo_aceite_em TIMESTAMPTZ;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS update_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_admissao DATE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN DEFAULT FALSE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'colaborador';

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_colaboradores_unidade ON colaboradores(unidade_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON colaboradores(cpf);
CREATE INDEX IF NOT EXISTS idx_colaboradores_telefone ON colaboradores(telefone);
CREATE INDEX IF NOT EXISTS idx_colaboradores_role ON colaboradores(role);

-- 4. Trigger update_at (sync com updated_at)
CREATE OR REPLACE FUNCTION colaboradores_sync_update_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = COALESCE(NEW.updated_at, now());
  NEW.update_at = NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_colaboradores_sync_update_at ON colaboradores;
CREATE TRIGGER trg_colaboradores_sync_update_at
  BEFORE UPDATE ON colaboradores
  FOR EACH ROW
  EXECUTE PROCEDURE colaboradores_sync_update_at();

-- 5. Recarrega schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
