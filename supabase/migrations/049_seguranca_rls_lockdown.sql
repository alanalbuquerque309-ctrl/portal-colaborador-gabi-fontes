-- 049 — Lockdown de segurança: fecha acesso público (anon/authenticated) ao banco.
--
-- Contexto: o app usa exclusivamente o service_role (createAdminClient) no servidor.
-- Nenhum componente usa os clients anon (src/lib/supabase/client.ts e server.ts não são
-- importados em lugar nenhum). Por isso revogar o acesso de anon/authenticated NÃO quebra
-- o funcionamento atual, e fecha a exposição da tabela `colaboradores` (CPF, telefone,
-- e-mail e senha_hash) e a escrita livre que a política aberta permitia.
--
-- Pensado para futuro multi-tenant: a trava é por privilégio de papel (role), o que
-- mantém o caminho aberto para políticas RLS por unidade/tenant depois, sem reescrever.

-- 1) Revoga TODO acesso de leitura/escrita dos papéis públicos no schema public.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 2) Impede que tabelas/sequências futuras voltem a nascer abertas para esses papéis.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 3) Defesa em profundidade: remove as políticas permissivas herdadas da 002,
--    que permitiam SELECT de tudo e UPDATE livre em colaboradores.
DROP POLICY IF EXISTS "colaboradores_select_by_cpf" ON colaboradores;
DROP POLICY IF EXISTS "colaboradores_update_onboarding" ON colaboradores;

-- Mantém RLS habilitado (já estava). Sem políticas + sem GRANT, anon/authenticated não
-- acessam nada; o service_role continua com acesso total (ignora RLS por padrão).
