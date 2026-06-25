-- Conclusão do treino de liderança (Quinta do café / vídeo por perfil).
-- Chave por video_youtube_id: ao trocar o vídeo, líderes voltam a ter pendência.

CREATE TABLE IF NOT EXISTS treino_lider_conclusoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  video_youtube_id TEXT NOT NULL,
  concluido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, video_youtube_id)
);

CREATE INDEX IF NOT EXISTS idx_treino_lider_conclusoes_colaborador
  ON treino_lider_conclusoes(colaborador_id);

ALTER TABLE treino_lider_conclusoes ENABLE ROW LEVEL SECURITY;
