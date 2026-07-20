-- Autor do comunicado (quem publicou) + nome denormalizado para exibição no portal.

ALTER TABLE avisos
  ADD COLUMN IF NOT EXISTS publicado_por_id uuid REFERENCES colaboradores(id) ON DELETE SET NULL;

ALTER TABLE avisos
  ADD COLUMN IF NOT EXISTS publicado_por_nome text;

CREATE INDEX IF NOT EXISTS idx_avisos_publicado_por
  ON avisos (publicado_por_id)
  WHERE publicado_por_id IS NOT NULL;

COMMENT ON COLUMN avisos.publicado_por_id IS
  'Colaborador que publicou o aviso (null se login por senha admin).';
COMMENT ON COLUMN avisos.publicado_por_nome IS
  'Nome exibido no portal (snapshot na publicação; ex.: Administração).';
