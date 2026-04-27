-- CPF pode ficar em branco no cadastro pelo RH; o colaborador informa no portal para concluir o cadastro.
ALTER TABLE colaboradores ALTER COLUMN cpf DROP NOT NULL;

COMMENT ON COLUMN colaboradores.cpf IS 'Opcional até o colaborador informar no portal (completar cadastro).';

NOTIFY pgrst, 'reload schema';
