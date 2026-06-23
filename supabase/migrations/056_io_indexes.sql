-- Índices para reduzir leituras em disco nas consultas mais frequentes do portal.

CREATE INDEX IF NOT EXISTS idx_avaliacoes_diarias_data_referencia
  ON avaliacoes_diarias (data_referencia);

CREATE INDEX IF NOT EXISTS idx_emocional_colaborador_data
  ON emocional_registro (colaborador_id, data);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_lideranca_semana_avaliado
  ON avaliacoes_lideranca (semana_inicio, avaliado_id);
