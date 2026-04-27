-- Canal interno de ajuda (colaborador <-> administrativo/RH).

CREATE TABLE IF NOT EXISTS ajuda_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
  mensagem TEXT NOT NULL,
  resposta TEXT,
  respondido_por_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  lido_admin_em TIMESTAMPTZ,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajuda_chat_colaborador ON ajuda_chat(colaborador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ajuda_chat_pendentes ON ajuda_chat(respondido_em) WHERE respondido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_ajuda_chat_created_at ON ajuda_chat(created_at DESC);

CREATE OR REPLACE FUNCTION ajuda_chat_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ajuda_chat_updated ON ajuda_chat;
CREATE TRIGGER trg_ajuda_chat_updated
  BEFORE UPDATE ON ajuda_chat
  FOR EACH ROW
  EXECUTE PROCEDURE ajuda_chat_set_updated_at();
