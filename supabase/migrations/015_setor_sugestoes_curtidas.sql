-- Setor (local) do colaborador — lista fixa na aplicação
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS setor TEXT;

-- Sugestões: leitura pela administração + curtidas
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS visualizado_em TIMESTAMPTZ;
ALTER TABLE sugestoes_reclamacoes ADD COLUMN IF NOT EXISTS curtidas INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sugestao_curtidas (
  sugestao_id UUID NOT NULL REFERENCES sugestoes_reclamacoes(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (sugestao_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_sugestao_curtidas_sugestao ON sugestao_curtidas(sugestao_id);

-- Novas unidades (sem Matriz no cadastro; linhas antigas podem permanecer no banco)
INSERT INTO unidades (nome, slug) VALUES ('Fábrica', 'fabrica')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO unidades (nome, slug) VALUES ('Administrativo', 'administrativo')
ON CONFLICT (slug) DO NOTHING;

-- Limpeza só de cargo, setor e unidade (dados pessoais intactos). Roles não são alterados aqui.
UPDATE colaboradores SET cargo = NULL WHERE cargo IS NOT NULL;
UPDATE colaboradores SET setor = NULL WHERE setor IS NOT NULL;
UPDATE colaboradores SET unidade_id = NULL WHERE unidade_id IS NOT NULL;

COMMENT ON COLUMN colaboradores.setor IS 'Setor fixo: Cozinha loja, Fábrica de doces, etc.';
COMMENT ON COLUMN sugestoes_reclamacoes.visualizado_em IS 'Quando admin marcou como lida';
COMMENT ON COLUMN sugestoes_reclamacoes.curtidas IS 'Contagem de curtidas (portal)';
