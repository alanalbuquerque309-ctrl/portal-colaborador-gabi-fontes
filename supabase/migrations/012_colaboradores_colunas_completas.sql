-- Garante todas as colunas da tabela colaboradores (schema cache)
-- Execute no SQL Editor do Supabase se surgir erro de coluna não encontrada

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_admissao DATE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'colaborador';

CREATE INDEX IF NOT EXISTS idx_colaboradores_telefone ON colaboradores(telefone);
CREATE INDEX IF NOT EXISTS idx_colaboradores_role ON colaboradores(role);

-- Força recarga do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
