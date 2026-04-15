-- Avaliação da liderança (colaborador → gerentes/admin da unidade), 1x por semana por par avaliador-avaliado.

CREATE TABLE IF NOT EXISTS avaliacoes_lideranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliador_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  avaliado_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES unidades (id) ON DELETE SET NULL,
  semana_inicio DATE NOT NULL,
  anonimo BOOLEAN NOT NULL DEFAULT FALSE,
  n_fala_escuta SMALLINT NOT NULL CHECK (n_fala_escuta >= 1 AND n_fala_escuta <= 5),
  n_apoio SMALLINT NOT NULL CHECK (n_apoio >= 1 AND n_apoio <= 5),
  n_ambiente SMALLINT NOT NULL CHECK (n_ambiente >= 1 AND n_ambiente <= 5),
  n_organizacao SMALLINT NOT NULL CHECK (n_organizacao >= 1 AND n_organizacao <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_avaliacao_lideranca_semana UNIQUE (avaliador_id, avaliado_id, semana_inicio),
  CONSTRAINT chk_avaliacao_lideranca_distinct CHECK (avaliador_id <> avaliado_id)
);

CREATE INDEX IF NOT EXISTS idx_av_lider_avaliador ON avaliacoes_lideranca (avaliador_id);
CREATE INDEX IF NOT EXISTS idx_av_lider_avaliado ON avaliacoes_lideranca (avaliado_id);
CREATE INDEX IF NOT EXISTS idx_av_lider_semana ON avaliacoes_lideranca (semana_inicio);

COMMENT ON TABLE avaliacoes_lideranca IS 'Feedback anônimo ou identificado: colaborador avalia líderes/admin da mesma unidade, 1 vez por semana.';
