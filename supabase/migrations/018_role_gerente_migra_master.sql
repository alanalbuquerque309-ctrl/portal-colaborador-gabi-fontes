-- Migra perfil legado 'master' → 'gerente' (avaliação da equipe).
-- Rode no SQL Editor da Supabase se ainda existirem linhas com role master.

UPDATE colaboradores SET role = 'gerente' WHERE role = 'master';

NOTIFY pgrst, 'reload schema';
