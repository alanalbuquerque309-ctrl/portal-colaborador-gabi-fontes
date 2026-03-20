-- Senha do portal (hash). Nunca armazenar senha em texto plano.
ALTER TABLE colaboradores
  ADD COLUMN IF NOT EXISTS senha_hash TEXT;

COMMENT ON COLUMN colaboradores.senha_hash IS 'Hash scrypt da senha do portal (CPF + senha no login)';
