-- Portal do Colaborador - Gabi Fontes
-- Schema inicial: colaboradores, unidades, avisos, perdas, aniversariantes

-- Unidades (Mesquita, Barra, Nova Iguaçu)
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO unidades (nome, slug) VALUES
  ('Mesquita', 'mesquita'),
  ('Barra', 'barra'),
  ('Nova Iguaçu', 'nova-iguacu');

-- Colaboradores (vinculados à unidade)
-- CPF usado para login; onboarding_completo controla redirecionamento
CREATE TABLE colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  data_nascimento DATE,
  onboarding_completo BOOLEAN DEFAULT FALSE,
  termo_aceite_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: colaborador só vê sua unidade
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

-- Avisos do mural (por unidade)
CREATE TABLE avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  titulo TEXT NOT NULL,
  conteudo TEXT,
  data_publicacao TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE avisos ENABLE ROW LEVEL SECURITY;

-- Relato de perdas (registro apenas)
CREATE TABLE itens_perda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Relatos enviados pelos colaboradores
CREATE TABLE relatos_perda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  item_id UUID REFERENCES itens_perda(id),
  item_descricao TEXT,
  motivo TEXT NOT NULL,
  foto_url TEXT,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE relatos_perda ENABLE ROW LEVEL SECURITY;

-- Aniversariantes (Mural da Família - todas as unidades)
-- Usa data_nascimento do colaborador; view ou query por mês

CREATE INDEX idx_colaboradores_unidade ON colaboradores(unidade_id);
CREATE INDEX idx_colaboradores_cpf ON colaboradores(cpf);
CREATE INDEX idx_avisos_unidade ON avisos(unidade_id);
CREATE INDEX idx_relatos_unidade ON relatos_perda(unidade_id);
