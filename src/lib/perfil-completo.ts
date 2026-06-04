/** Campos pessoais obrigatórios para liberar o portal (data_admissao fica com RH). */
export type PerfilPessoalFields = {
  nome?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
};

export function isPerfilPessoalCompleto(row: PerfilPessoalFields): boolean {
  return Boolean(
    String(row.nome ?? '').trim() &&
      String(row.endereco ?? '').trim() &&
      String(row.telefone ?? '').trim() &&
      String(row.email ?? '').trim() &&
      String(row.data_nascimento ?? '').trim()
  );
}

export function camposPerfilPessoalFaltando(row: PerfilPessoalFields): string[] {
  const faltando: string[] = [];
  if (!String(row.nome ?? '').trim()) faltando.push('nome');
  if (!String(row.email ?? '').trim()) faltando.push('e-mail');
  if (!String(row.telefone ?? '').trim()) faltando.push('telefone');
  if (!String(row.endereco ?? '').trim()) faltando.push('endereço');
  if (!String(row.data_nascimento ?? '').trim()) faltando.push('data de nascimento');
  return faltando;
}
