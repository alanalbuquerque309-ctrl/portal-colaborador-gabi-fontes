-- Cadastra Alan Albuquerque (Sócio) como colaborador para acesso por CPF
-- role='socio' garante acesso às 3 lojas no portal
INSERT INTO colaboradores (cpf, nome, unidade_id, onboarding_completo, role)
SELECT '05376259765', 'Alan Albuquerque', id, true, 'socio'
FROM unidades WHERE slug = 'mesquita' LIMIT 1
ON CONFLICT (cpf) DO UPDATE SET
  nome = EXCLUDED.nome,
  onboarding_completo = EXCLUDED.onboarding_completo,
  role = COALESCE(colaboradores.role, 'socio');
