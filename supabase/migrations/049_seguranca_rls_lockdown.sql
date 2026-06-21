-- 049 — Lockdown de segurança: fecha acesso público (anon/authenticated) ao banco.
--
-- Contexto: o app usa exclusivamente o service_role (createAdminClient) no servidor.
-- Nenhum componente usa os clients anon (src/lib/supabase/client.ts e server.ts não são
-- importados em lugar nenhum). Por isso revogar o acesso de anon/authenticated NÃO quebra
-- o funcionamento atual, e fecha a exposição de colaboradores (CPF/telefone/email/senha_hash),
-- avaliações, termômetro emocional, sugestões/reclamações, escalas e usuarios_admin.
--
-- Pensado para futuro multi-tenant: o lockdown é por privilégio de papel (grants) com RLS
-- habilitado em tudo, o que deixa o caminho pronto para políticas por unidade/tenant depois,
-- sem reescrever nada.
--
-- O service_role ignora RLS por padrão e mantém acesso total: o app continua funcionando.

-- 1) Revoga TODO acesso de leitura/escrita dos papéis públicos no schema public (a trava real).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 2) Impede que objetos futuros voltem a nascer abertos para esses papéis.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 3) Defesa em profundidade + preparação SaaS: habilita RLS em TODAS as tabelas do public.
--    Sem grant e sem política, anon/authenticated não acessam nada; o service_role passa.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 4) Remove as políticas permissivas legadas (002): "USING (true)" / "WITH CHECK (true)".
--    Ficam obsoletas após o REVOKE e atrapalhariam políticas por tenant no futuro.
DROP POLICY IF EXISTS "colaboradores_select_by_cpf"   ON colaboradores;
DROP POLICY IF EXISTS "colaboradores_update_onboarding" ON colaboradores;
DROP POLICY IF EXISTS "avisos_select_all"             ON avisos;
DROP POLICY IF EXISTS "relatos_insert"                ON relatos_perda;
DROP POLICY IF EXISTS "relatos_select"                ON relatos_perda;
DROP POLICY IF EXISTS "unidades_select"               ON unidades;
