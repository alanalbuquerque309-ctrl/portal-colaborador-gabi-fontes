-- Catálogo Grãos: preço fixo em centavos (caixa); grãos cobrados derivam de GRAOS_CENTAVOS_POR_GRAO no app.

ALTER TABLE graos_catalogo
  ADD COLUMN IF NOT EXISTS preco_centavos INTEGER;

COMMENT ON COLUMN graos_catalogo.preco_centavos IS
  'Preço cobrado no caixa (centavos). Grãos do resgate = ceil(preco_centavos / GRAOS_CENTAVOS_POR_GRAO).';

-- Backfill a partir do seed original (1 grão = R$ 0,35 na migration 044).
UPDATE graos_catalogo
SET preco_centavos = graos * 35
WHERE preco_centavos IS NULL OR preco_centavos <= 0;

NOTIFY pgrst, 'reload schema';
