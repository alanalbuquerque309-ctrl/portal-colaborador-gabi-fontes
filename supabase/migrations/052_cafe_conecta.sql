-- Café Conecta — sorteios, ciclos e histórico (cultura organizacional)

CREATE TABLE IF NOT EXISTS cafe_conecta_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_slug TEXT NOT NULL,
  numero INTEGER NOT NULL DEFAULT 1,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  encerrado_em TIMESTAMPTZ,
  UNIQUE (grupo_slug, numero)
);

CREATE INDEX IF NOT EXISTS idx_cafe_conecta_ciclos_ativo
  ON cafe_conecta_ciclos (grupo_slug)
  WHERE encerrado_em IS NULL;

CREATE TABLE IF NOT EXISTS cafe_conecta_sorteios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_slug TEXT NOT NULL,
  ciclo_id UUID NOT NULL REFERENCES cafe_conecta_ciclos(id),
  semana_inicio DATE NOT NULL,
  data_referencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  seed TEXT,
  excecao_ciclo_impar BOOLEAN NOT NULL DEFAULT false,
  observacao_admin TEXT,
  publicado_por UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  publicado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cafe_conecta_sorteio_pub_semana
  ON cafe_conecta_sorteios (grupo_slug, semana_inicio)
  WHERE status = 'publicado';

CREATE INDEX IF NOT EXISTS idx_cafe_conecta_sorteios_grupo_created
  ON cafe_conecta_sorteios (grupo_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS cafe_conecta_sorteio_pessoas (
  sorteio_id UUID NOT NULL REFERENCES cafe_conecta_sorteios(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL CHECK (ordem IN (1, 2)),
  nome_snapshot TEXT NOT NULL,
  setor_snapshot TEXT,
  unidade_nome_snapshot TEXT,
  PRIMARY KEY (sorteio_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_cafe_conecta_pessoas_colab
  ON cafe_conecta_sorteio_pessoas (colaborador_id);

COMMENT ON TABLE cafe_conecta_ciclos IS 'Ciclos de participação Café Conecta por grupo de unidades';
COMMENT ON TABLE cafe_conecta_sorteios IS 'Sorteios semanais (rascunho ou publicado)';
COMMENT ON TABLE cafe_conecta_sorteio_pessoas IS 'Dupla sorteada por sorteio';
