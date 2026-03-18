-- Garante que Matriz existe (acesso todas as lojas)
INSERT INTO unidades (nome, slug) VALUES
  ('Matriz (todas as lojas)', 'matriz')
ON CONFLICT (slug) DO NOTHING;
