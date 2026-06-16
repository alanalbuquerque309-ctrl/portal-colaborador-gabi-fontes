-- Grãos de café: ledger, catálogo e resgates

CREATE TABLE IF NOT EXISTS graos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  graos INTEGER NOT NULL CHECK (graos > 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS graos_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  semana_inicio DATE,
  missao TEXT NOT NULL,
  graos INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendente', 'confirmado', 'cancelado')),
  ref_key TEXT NOT NULL,
  descricao TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT graos_movimentos_ref_key_uq UNIQUE (ref_key)
);

CREATE INDEX IF NOT EXISTS idx_graos_mov_colab ON graos_movimentos (colaborador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graos_mov_semana ON graos_movimentos (colaborador_id, semana_inicio);
CREATE INDEX IF NOT EXISTS idx_graos_mov_estado ON graos_movimentos (colaborador_id, estado);

CREATE TABLE IF NOT EXISTS graos_resgates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  total_graos INTEGER NOT NULL CHECK (total_graos >= 0),
  complemento_centavos INTEGER NOT NULL DEFAULT 0 CHECK (complemento_centavos >= 0),
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graos_resgates_colab ON graos_resgates (colaborador_id, created_at DESC);

CREATE TABLE IF NOT EXISTS graos_quinta_conclusoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores (id) ON DELETE CASCADE,
  data_quinta DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT graos_quinta_conclusoes_uq UNIQUE (colaborador_id, data_quinta)
);

INSERT INTO graos_catalogo (nome, graos, ordem)
SELECT v.nome, v.graos, v.ordem
FROM (VALUES
  ('Docinho (unidade)', 9, 10),
  ('Café coado 120ml', 18, 20),
  ('Cookie tradicional', 18, 30),
  ('Espresso ou carioca', 20, 40),
  ('Cuscuz com manteiga', 27, 50),
  ('Pão de queijo grande', 35, 60),
  ('Chá por infusão', 39, 70),
  ('Fatia de torta ou bolo', 50, 80),
  ('Sair 1h mais cedo (aprovação gerente)', 45, 90),
  ('Kit Gabi Fontes', 230, 100)
) AS v(nome, graos, ordem)
WHERE NOT EXISTS (SELECT 1 FROM graos_catalogo LIMIT 1);

NOTIFY pgrst, 'reload schema';
