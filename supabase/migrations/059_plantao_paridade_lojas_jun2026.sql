-- Plantão 12×36: paridade base jun/2026 nas lojas (linha * = gerente de unidade).
-- Mesquita: Joyce par / Silvia ímpar. Nova Iguaçu: Nathalia par / Vanessa ímpar. Barra: Lucas par / Matheus ímpar.

UPDATE lideres_por_setor lps
SET plantao_paridade = 'par',
    plantao_paridade_mes_ref = '2026-06',
    updated_at = NOW()
FROM colaboradores c, unidades u
WHERE lps.lider_id = c.id
  AND lps.unidade_id = u.id
  AND lps.setor = '*'
  AND lps.ativo = TRUE
  AND u.slug = 'mesquita'
  AND c.nome ILIKE 'Joyce%';

UPDATE lideres_por_setor lps
SET plantao_paridade = 'impar',
    plantao_paridade_mes_ref = '2026-06',
    updated_at = NOW()
FROM colaboradores c, unidades u
WHERE lps.lider_id = c.id
  AND lps.unidade_id = u.id
  AND lps.setor = '*'
  AND lps.ativo = TRUE
  AND u.slug = 'mesquita'
  AND c.nome ILIKE 'Silvia%';

UPDATE lideres_por_setor lps
SET plantao_paridade = 'par',
    plantao_paridade_mes_ref = '2026-06',
    updated_at = NOW()
FROM colaboradores c, unidades u
WHERE lps.lider_id = c.id
  AND lps.unidade_id = u.id
  AND lps.setor = '*'
  AND lps.ativo = TRUE
  AND u.slug = 'nova-iguacu'
  AND c.nome ILIKE 'Nathalia%';

UPDATE lideres_por_setor lps
SET plantao_paridade = 'impar',
    plantao_paridade_mes_ref = '2026-06',
    updated_at = NOW()
FROM colaboradores c, unidades u
WHERE lps.lider_id = c.id
  AND lps.unidade_id = u.id
  AND lps.setor = '*'
  AND lps.ativo = TRUE
  AND u.slug = 'nova-iguacu'
  AND c.nome ILIKE 'Vanessa%';

UPDATE lideres_por_setor lps
SET plantao_paridade = 'par',
    plantao_paridade_mes_ref = '2026-06',
    updated_at = NOW()
FROM colaboradores c, unidades u
WHERE lps.lider_id = c.id
  AND lps.unidade_id = u.id
  AND lps.setor = '*'
  AND lps.ativo = TRUE
  AND u.slug = 'barra'
  AND c.nome ILIKE 'Lucas%';

UPDATE lideres_por_setor lps
SET plantao_paridade = 'impar',
    plantao_paridade_mes_ref = '2026-06',
    updated_at = NOW()
FROM colaboradores c, unidades u
WHERE lps.lider_id = c.id
  AND lps.unidade_id = u.id
  AND lps.setor = '*'
  AND lps.ativo = TRUE
  AND u.slug = 'barra'
  AND c.nome ILIKE 'Matheus%';

NOTIFY pgrst, 'reload schema';
