-- Sincroniza grãos cobrados no catálogo com 1 grão = R$ 0,20 (20 centavos).
-- O preço em R$ no caixa (preco_centavos) permanece; só sobe a quantidade de grãos do resgate.

UPDATE graos_catalogo
SET graos = GREATEST(
  1,
  CEIL(
    COALESCE(NULLIF(preco_centavos, 0), graos * 35)::numeric / 20
  )::integer
)
WHERE ativo = TRUE;

NOTIFY pgrst, 'reload schema';
