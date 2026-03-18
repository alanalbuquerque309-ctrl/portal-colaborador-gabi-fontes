-- Corrige erro "could not find the update_at column" no schema cache do Supabase
-- Algumas configurações do Supabase esperam a coluna "update_at" (compatibilidade)

-- Garante que updated_at existe
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Adiciona update_at se o schema cache do PostgREST/Supabase esperar esse nome
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS update_at TIMESTAMPTZ DEFAULT now();

-- Trigger para manter update_at em sync com updated_at em updates
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

-- Força o PostgREST a recarregar o schema
NOTIFY pgrst, 'reload schema';
