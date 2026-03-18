-- Bloco 5: Mural segmentado + Checklist de confirmação
-- Avisos: exige_confirmacao para avisos que o colaborador deve marcar "Li"
-- aviso_confirmacoes: registro de quem confirmou

-- Garantir tabela avisos (caso bootstrap não a tenha criado)
CREATE TABLE IF NOT EXISTS avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  titulo TEXT NOT NULL,
  conteudo TEXT,
  data_publicacao TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coluna para avisos que exigem confirmação do colaborador
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS exige_confirmacao BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_avisos_unidade ON avisos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_avisos_ativo ON avisos(ativo);

-- Checklist: confirmação de leitura por colaborador
CREATE TABLE IF NOT EXISTS aviso_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id UUID NOT NULL REFERENCES avisos(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  confirmado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aviso_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS idx_aviso_confirmacoes_aviso ON aviso_confirmacoes(aviso_id);
CREATE INDEX IF NOT EXISTS idx_aviso_confirmacoes_colaborador ON aviso_confirmacoes(colaborador_id);

-- RLS: service role na API bypassa; policies podem ser adicionadas se usar anon
ALTER TABLE aviso_confirmacoes ENABLE ROW LEVEL SECURITY;
