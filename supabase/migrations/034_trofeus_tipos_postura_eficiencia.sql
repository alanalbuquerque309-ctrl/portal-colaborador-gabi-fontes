-- Troféus entre pares: Postura, Braço direito, Eficiência (substitui energia_contagiante e olhar_dono)

UPDATE trofeus_entre_pares SET tipo = 'postura' WHERE tipo = 'energia_contagiante';
UPDATE trofeus_entre_pares SET tipo = 'eficiencia' WHERE tipo = 'olhar_dono';

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'trofeus_entre_pares'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE trofeus_entre_pares DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE trofeus_entre_pares
  ADD CONSTRAINT trofeus_entre_pares_tipo_check
  CHECK (tipo IN ('postura', 'braco_direito', 'eficiencia'));

NOTIFY pgrst, 'reload schema';
