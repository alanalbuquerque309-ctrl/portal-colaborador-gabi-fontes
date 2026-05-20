-- Reconhecimento entre pares (troféus semanais)
CREATE TABLE IF NOT EXISTS trofeus_entre_pares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('postura', 'braco_direito', 'eficiencia')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trofeus_entre_pares_uq UNIQUE (avaliador_id, destinatario_id, semana_inicio),
  CONSTRAINT trofeus_entre_pares_sem_auto CHECK (avaliador_id <> destinatario_id)
);

CREATE INDEX IF NOT EXISTS idx_trofeus_entre_pares_unidade_semana
  ON trofeus_entre_pares (unidade_id, semana_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_trofeus_entre_pares_destinatario
  ON trofeus_entre_pares (destinatario_id, semana_inicio DESC);

NOTIFY pgrst, 'reload schema';
