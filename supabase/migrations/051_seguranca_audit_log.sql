-- 051 — Passo 5 de segurança: auditoria de ações sensíveis (audit_log).
--
-- Tabela aditiva e append-only (na prática): registra QUEM fez O QUÊ, em QUEM e QUANDO, para
-- rastreabilidade e resposta a incidentes. Sem PII: guarda IDs (uuid) e metadados mínimos em
-- jsonb, nunca CPF/nome/e-mail/senha.
--
-- Multi-tenant futuro: unidade_id reservado para filtrar por tenant depois, sem reescrever.
-- O alvo é guardado como texto SEM foreign key de propósito: o log precisa sobreviver à exclusão
-- do alvo (ex.: auditar a própria exclusão de um colaborador).
--
-- Padrão do 049/050: RLS habilitado, sem políticas; service_role ignora RLS; anon/authenticated
-- sem grant.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ator_colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  ator_tipo TEXT NOT NULL DEFAULT 'sistema', -- portal | senha_admin | sistema
  acao TEXT NOT NULL,                        -- ex.: 'colaborador.role.alterar'
  alvo_tipo TEXT,                            -- ex.: 'colaborador'
  alvo_id TEXT,                              -- id do alvo (texto, sem FK: sobrevive à exclusão)
  unidade_id UUID REFERENCES unidades(id),   -- tenant reservado
  detalhes JSONB,                            -- metadados não-PII (ex.: {"de":"colaborador","para":"gerente"})
  ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_criado_em ON audit_log(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_acao ON audit_log(acao, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_ator ON audit_log(ator_colaborador_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_alvo ON audit_log(alvo_tipo, alvo_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
