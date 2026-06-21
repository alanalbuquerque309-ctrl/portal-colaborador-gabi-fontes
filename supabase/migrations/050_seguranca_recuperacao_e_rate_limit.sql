-- 050 — Passo 4 de segurança: recuperação de senha por fila do RH + rate limit no login.
--
-- Contexto: o portal não tem envio de e-mail/SMS, então a "recuperação" deixa de resetar a
-- senha automaticamente (vetor de takeover só com telefone+e-mail) e passa a registrar uma
-- SOLICITAÇÃO que o RH/admin atende no painel (redefine para a senha padrão com troca forçada).
--
-- Também adiciona rate limit durável (Postgres, via service_role) para login e recuperação,
-- já que não há Vercel KV/Redis e o estado em memória não sobrevive ao serverless.
--
-- Aditivo: só cria tabelas/índices novos, não altera nada existente. Mantém o padrão do 049
-- (RLS habilitado, sem políticas; service_role ignora RLS; anon/authenticated sem grant).
-- Pensado para multi-tenant futuro: guarda unidade_id como snapshot para filtragem por tenant.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Fila de solicitações de redefinição de senha (atendida manualmente pelo RH/admin).
CREATE TABLE IF NOT EXISTS solicitacoes_redefinicao_senha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES unidades(id),
  nome_snapshot TEXT,
  telefone_informado TEXT,
  email_informado TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | atendida | rejeitada
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atendido_em TIMESTAMPTZ,
  atendido_por UUID REFERENCES colaboradores(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_redefinicao_status
  ON solicitacoes_redefinicao_senha(status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_redefinicao_colaborador
  ON solicitacoes_redefinicao_senha(colaborador_id);

-- Evita fila duplicada: no máximo uma solicitação pendente por colaborador.
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitacoes_redefinicao_pendente_por_colaborador
  ON solicitacoes_redefinicao_senha(colaborador_id)
  WHERE status = 'pendente';

-- 2) Rate limit durável (login e recuperação de senha).
CREATE TABLE IF NOT EXISTS rate_limit_tentativas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  escopo TEXT NOT NULL,        -- 'login' | 'recuperar_senha'
  tipo_chave TEXT NOT NULL,    -- 'identidade' | 'ip'
  chave TEXT NOT NULL,         -- login canônico / telefone / IP normalizado
  sucesso BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON rate_limit_tentativas(escopo, tipo_chave, chave, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_criado_em
  ON rate_limit_tentativas(criado_em);

-- 3) Defesa em profundidade (igual ao 049): RLS habilitado, sem políticas.
ALTER TABLE solicitacoes_redefinicao_senha ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tentativas ENABLE ROW LEVEL SECURITY;
