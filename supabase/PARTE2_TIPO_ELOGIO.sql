ALTER TABLE sugestoes_reclamacoes DROP CONSTRAINT IF EXISTS sugestoes_reclamacoes_tipo_check;
ALTER TABLE sugestoes_reclamacoes DROP CONSTRAINT IF EXISTS sugestoes_reclamacoes_tipo_chk;
ALTER TABLE sugestoes_reclamacoes ADD CONSTRAINT sugestoes_reclamacoes_tipo_check CHECK (tipo IN ('sugestao', 'reclamacao', 'elogio'));
