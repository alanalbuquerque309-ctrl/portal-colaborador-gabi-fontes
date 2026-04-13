-- Garante coluna setor em produção (evita erro PostgREST: column not in schema cache).
-- Seguro: não apaga cargo/unidade. Rode no SQL Editor da Supabase se o cadastro falhar com "setor".
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS setor TEXT;

COMMENT ON COLUMN colaboradores.setor IS 'Setor fixo: Cozinha loja, Fábrica de doces, etc.';
