-- Insere Alan Albuquerque para login por CPF
-- Funciona com ou sem a coluna role (migration 003)
-- Execute no Supabase → SQL Editor

INSERT INTO colaboradores (cpf, nome, unidade_id, onboarding_completo)
SELECT '05376259765', 'Alan Albuquerque', id, true
FROM unidades WHERE slug = 'mesquita' LIMIT 1
ON CONFLICT (cpf) DO UPDATE SET
  nome = EXCLUDED.nome,
  onboarding_completo = EXCLUDED.onboarding_completo;

-- Se a coluna role existe (após migration 003), defina como sócio:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'colaboradores' AND column_name = 'role'
  ) THEN
    UPDATE colaboradores SET role = 'socio' WHERE cpf = '05376259765';
  END IF;
END $$;
