-- Garante que role aceita gerente e master (legado). Alguns bancos só tinham CHECK antigo sem gerente.
-- Rode no SQL Editor se UPDATE de role para 'gerente' falhar silenciosamente ou com erro de check.

ALTER TABLE colaboradores DROP CONSTRAINT IF EXISTS colaboradores_role_check;

ALTER TABLE colaboradores
  ADD CONSTRAINT colaboradores_role_check
  CHECK (
    role IS NULL
    OR role IN ('colaborador', 'gerente', 'master', 'admin', 'socio')
  );

NOTIFY pgrst, 'reload schema';
