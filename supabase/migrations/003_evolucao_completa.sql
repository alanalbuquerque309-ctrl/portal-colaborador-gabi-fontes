-- Portal do Colaborador - Evolução completa
-- role, telefone, foto, admins, elogios, sugestões, reclamações, checklists, destaques, notificações

-- 1. Colunas novas em colaboradores
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'colaborador'
  CHECK (role IN ('colaborador', 'gerente', 'admin', 'socio'));

CREATE INDEX IF NOT EXISTS idx_colaboradores_telefone ON colaboradores(telefone);
CREATE INDEX IF NOT EXISTS idx_colaboradores_role ON colaboradores(role);

-- 2. Usuários admin (login separado: email + senha)
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'administrador' CHECK (role IN ('socio', 'administrador')),
  ativo BOOLEAN DEFAULT TRUE,
  criado_por UUID REFERENCES usuarios_admin(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usuarios_admin_email ON usuarios_admin(email);

-- 3. Códigos de verificação (WhatsApp)
CREATE TABLE IF NOT EXISTS codigos_verificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL,
  codigo TEXT NOT NULL,
  telefone TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_codigos_cpf_expira ON codigos_verificacao(cpf, expira_em);

-- 4. Espaço do Elogio (público)
CREATE TABLE IF NOT EXISTS elogios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  de_colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  para_colaborador_id UUID REFERENCES colaboradores(id),
  para_nome TEXT,
  texto TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  aprovado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_elogios_unidade ON elogios(unidade_id);

-- 5. Sugestões (não anônimas, públicas)
CREATE TABLE IF NOT EXISTS sugestoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  texto TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sugestoes_unidade ON sugestoes(unidade_id);

-- 6. Reclamações (anônimas, só admin vê)
CREATE TABLE IF NOT EXISTS reclamacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES unidades(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reclamacoes_unidade ON reclamacoes(unidade_id);

-- 7. Checklists por setor (admin cria)
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  setor TEXT,
  unidade_id UUID REFERENCES unidades(id),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checklist_marcacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES checklist_itens(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  data DATE NOT NULL,
  marcado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, colaborador_id, data)
);

CREATE INDEX idx_checklist_marcacoes_data ON checklist_marcacoes(data);

-- 8. Destaques / Mural da Excelência
CREATE TABLE IF NOT EXISTS destaques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('aniversariante', 'elogio', 'destaque', 'outro')),
  titulo TEXT,
  texto TEXT,
  colaborador_id UUID REFERENCES colaboradores(id),
  foto_url TEXT,
  data_referencia DATE,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Notificações (alerta geral ou por grupo)
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  corpo TEXT,
  tipo TEXT DEFAULT 'geral' CHECK (tipo IN ('geral', 'unidade')),
  unidade_id UUID REFERENCES unidades(id),
  lida_por UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);

-- 10. Erros/monitoramento (para alertar admin)
CREATE TABLE IF NOT EXISTS log_erros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem TEXT,
  stack TEXT,
  rota TEXT,
  usuario_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
