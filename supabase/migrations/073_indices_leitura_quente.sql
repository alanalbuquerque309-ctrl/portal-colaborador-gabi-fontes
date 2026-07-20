-- Índices para as consultas quentes do portal (polling e telas frequentes)
-- + limpeza de tabelas que crescem sem poda.
-- Objetivo: cortar E/S de disco no plano Free (consultas sem índice = varredura completa).

-- Avaliações semanais (pendências da semana, relatórios, gorjeta)
CREATE INDEX IF NOT EXISTS idx_aval_diarias_data_ref
  ON avaliacoes_diarias (data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_aval_diarias_colab_data
  ON avaliacoes_diarias (colaborador_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_aval_diarias_avaliador_data
  ON avaliacoes_diarias (avaliador_id, data_referencia DESC);

-- Avaliação de liderança (semana corrente)
CREATE INDEX IF NOT EXISTS idx_aval_lideranca_semana
  ON avaliacoes_lideranca (semana_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_aval_lideranca_avaliado_semana
  ON avaliacoes_lideranca (avaliado_id, semana_inicio DESC);

-- Chat da equipe (poll a cada 20s)
CREATE INDEX IF NOT EXISTS idx_equipe_chat_sala
  ON equipe_chat_mensagens (created_at DESC)
  WHERE destinatario_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_equipe_chat_destinatario
  ON equipe_chat_mensagens (destinatario_id, created_at DESC)
  WHERE destinatario_id IS NOT NULL;

-- Canal de ajuda (poll a cada 20s + contador de pendentes)
CREATE INDEX IF NOT EXISTS idx_ajuda_chat_colab_data
  ON ajuda_chat (colaborador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ajuda_chat_pendentes
  ON ajuda_chat (created_at DESC)
  WHERE resposta IS NULL;

-- Sugestões (contador de pendentes no header)
CREATE INDEX IF NOT EXISTS idx_sugestoes_nao_vistas
  ON sugestoes_reclamacoes (created_at DESC)
  WHERE visualizado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_sugestoes_unidade_data
  ON sugestoes_reclamacoes (unidade_id, created_at DESC);

-- Grãos (saldo e missões da semana)
CREATE INDEX IF NOT EXISTS idx_graos_mov_colab_data
  ON graos_movimentos (colaborador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graos_mov_estado_semana
  ON graos_movimentos (estado, semana_inicio);

-- Rate limit de login (consultado a cada tentativa; cresce sem parar)
CREATE INDEX IF NOT EXISTS idx_rate_limit_chave_data
  ON rate_limit_tentativas (escopo, tipo_chave, chave, criado_em DESC);

-- Auditoria (consultas por período)
CREATE INDEX IF NOT EXISTS idx_audit_log_criado_em
  ON audit_log (criado_em DESC);

-- Emocional (alertas de gestão por dia)
CREATE INDEX IF NOT EXISTS idx_emocional_registro_data
  ON emocional_registro (data DESC);
CREATE INDEX IF NOT EXISTS idx_emocional_registro_colab_data
  ON emocional_registro (colaborador_id, data DESC);

-- Escalas (consulta por colaborador/data)
CREATE INDEX IF NOT EXISTS idx_escalas_colab_data
  ON escalas (colaborador_id, data DESC);

-- Troféus entre pares (ranking semanal)
CREATE INDEX IF NOT EXISTS idx_trofeus_pares_semana
  ON trofeus_entre_pares (semana_inicio DESC, unidade_id);

-- Limpeza: tentativas de login com mais de 30 dias não servem para nada
DELETE FROM rate_limit_tentativas
WHERE criado_em < now() - interval '30 days';

ANALYZE;
