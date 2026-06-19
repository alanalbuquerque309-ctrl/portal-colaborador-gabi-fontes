-- Visualização de avisos + biblioteca de treinamentos

CREATE TABLE IF NOT EXISTS aviso_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id UUID NOT NULL REFERENCES avisos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  visualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_aviso_visualizacoes_aviso ON aviso_visualizacoes(aviso_id);
CREATE INDEX IF NOT EXISTS idx_aviso_visualizacoes_colaborador ON aviso_visualizacoes(colaborador_id);

CREATE TABLE IF NOT EXISTS treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  video_youtube_url TEXT,
  publico_alvo TEXT NOT NULL DEFAULT 'todos',
  unidade_id UUID REFERENCES unidades(id),
  exige_confirmacao BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treinamentos_ativo ON treinamentos(ativo);
CREATE INDEX IF NOT EXISTS idx_treinamentos_ordem ON treinamentos(ordem, created_at DESC);

CREATE TABLE IF NOT EXISTS treinamento_visualizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  visualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(treinamento_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_treinamento_visualizacoes_treinamento ON treinamento_visualizacoes(treinamento_id);

CREATE TABLE IF NOT EXISTS treinamento_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID NOT NULL REFERENCES treinamentos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  confirmado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(treinamento_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_treinamento_confirmacoes_treinamento ON treinamento_confirmacoes(treinamento_id);

ALTER TABLE aviso_visualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_visualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinamento_confirmacoes ENABLE ROW LEVEL SECURITY;
