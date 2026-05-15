-- Chat interno da equipe: sala geral (destinatario_id NULL) e mensagens diretas 1:1.

CREATE TABLE IF NOT EXISTS equipe_chat_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  destinatario_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  lido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT equipe_chat_mensagem_min_len CHECK (char_length(trim(mensagem)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_equipe_chat_sala ON equipe_chat_mensagens(created_at DESC)
  WHERE destinatario_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipe_chat_direto_autor ON equipe_chat_mensagens(autor_id, created_at DESC)
  WHERE destinatario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipe_chat_direto_dest ON equipe_chat_mensagens(destinatario_id, created_at DESC)
  WHERE destinatario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipe_chat_destinatario_pendente ON equipe_chat_mensagens(destinatario_id, lido_em)
  WHERE destinatario_id IS NOT NULL AND lido_em IS NULL;
