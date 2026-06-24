-- Nova Iguaçu: Vanessa (gerente) + Nathalia; remove vínculos legados Joyce → colaboradores NI.
-- Complemento: rodar `npm run lideranca:aplicar` para upsert em lideres_por_setor e sincronizar colaboradores_lideres.

-- Desativa Joyce como líder materializado de colaboradores de Nova Iguaçu (cobertura temporária encerrada).
UPDATE colaboradores_lideres cl
SET ativo = FALSE,
    updated_at = NOW()
FROM colaboradores c,
     colaboradores l,
     unidades u
WHERE cl.colaborador_id = c.id
  AND cl.lider_id = l.id
  AND c.unidade_id = u.id
  AND u.slug = 'nova-iguacu'
  AND l.nome ILIKE 'Joyce%'
  AND cl.ativo = TRUE;

NOTIFY pgrst, 'reload schema';
