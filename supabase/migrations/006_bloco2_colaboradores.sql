-- Bloco 2: Colunas extras para cadastro de colaboradores
-- Execute no Supabase SQL Editor ou via supabase db push

ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS data_admissao DATE;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS foto_url TEXT;
