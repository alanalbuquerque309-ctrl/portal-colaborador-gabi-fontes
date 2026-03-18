-- Políticas RLS para Portal do Colaborador
-- Login por CPF usa anon key; estas políticas permitem as operações necessárias.

-- Colaboradores: SELECT por CPF (para login) e UPDATE para onboarding
CREATE POLICY "colaboradores_select_by_cpf"
  ON colaboradores FOR SELECT
  USING (true);

CREATE POLICY "colaboradores_update_onboarding"
  ON colaboradores FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Avisos: SELECT por unidade (usado após login, filtrado no app)
CREATE POLICY "avisos_select_all"
  ON avisos FOR SELECT
  USING (true);

-- Relatos de perda: INSERT e SELECT para colaboradores da unidade
CREATE POLICY "relatos_insert"
  ON relatos_perda FOR INSERT
  WITH CHECK (true);

CREATE POLICY "relatos_select"
  ON relatos_perda FOR SELECT
  USING (true);

-- Unidades: SELECT (lista de unidades)
CREATE POLICY "unidades_select"
  ON unidades FOR SELECT
  USING (true);
