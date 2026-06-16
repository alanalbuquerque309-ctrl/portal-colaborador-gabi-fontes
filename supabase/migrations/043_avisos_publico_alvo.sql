-- Público-alvo explícito nos avisos (todos, adm, fabrica-doce, mesquita, nova-iguacu, barra)
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS publico_alvo text;

COMMENT ON COLUMN avisos.publico_alvo IS
  'Público: todos | adm | fabrica-doce | mesquita | nova-iguacu | barra. NULL = legado (inferir por unidade_id).';
