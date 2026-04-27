-- Login do portal por telefone (LGPD): coluna normalizada (apenas dígitos BR, sem +55).
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS telefone_login TEXT;

COMMENT ON COLUMN colaboradores.telefone_login IS 'Somente dígitos (DDD + número). Usado no login do portal.';

CREATE OR REPLACE FUNCTION public._normalize_telefone_login_br(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  d TEXT;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN RETURN NULL; END IF;
  d := regexp_replace(raw, '[^0-9]', '', 'g');
  IF d IS NULL OR d = '' THEN RETURN NULL; END IF;
  d := regexp_replace(d, '^0+', '');
  IF length(d) >= 12 AND left(d, 2) = '55' THEN d := substring(d from 3); END IF;
  IF length(d) < 10 OR length(d) > 11 THEN RETURN NULL; END IF;
  RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE colaboradores
SET telefone_login = public._normalize_telefone_login_br(telefone)
WHERE telefone IS NOT NULL;

-- Duplicatas: mantém um registro por telefone_login (demais ficam sem login por telefone até o RH corrigir).
UPDATE colaboradores c
SET telefone_login = NULL
FROM (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY telefone_login ORDER BY created_at NULLS LAST, id) AS rn
    FROM colaboradores
    WHERE telefone_login IS NOT NULL
  ) t
  WHERE rn > 1
) dup
WHERE c.id = dup.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_colaboradores_telefone_login
ON colaboradores (telefone_login)
WHERE telefone_login IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_colaboradores_telefone_login_lookup
ON colaboradores (telefone_login)
WHERE telefone_login IS NOT NULL;

NOTIFY pgrst, 'reload schema';
