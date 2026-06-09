import { normalizePortalRole } from '@/lib/roles';

/** Campos pessoais obrigatórios para liberar o portal (data_admissao fica com RH). */
export type PerfilPessoalFields = {
  nome?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
  foto_url?: string | null;
};

export function temFotoPerfil(fotoUrl: string | null | undefined): boolean {
  return Boolean(String(fotoUrl ?? '').trim());
}

/** Foto obrigatória só para colaboradores de chão de loja; liderança/sócio não entram no gate. */
export function fotoObrigatoriaPortal(role: string | null | undefined): boolean {
  return normalizePortalRole(role) === 'colaborador';
}

export function isPerfilPessoalCompleto(row: PerfilPessoalFields): boolean {
  return Boolean(
    String(row.nome ?? '').trim() &&
      String(row.endereco ?? '').trim() &&
      String(row.telefone ?? '').trim() &&
      String(row.email ?? '').trim() &&
      String(row.data_nascimento ?? '').trim()
  );
}

/** Texto + foto — uso futuro; hoje a foto tem gate próprio após onboarding. */
export function isCadastroPortalCompleto(row: PerfilPessoalFields): boolean {
  return isPerfilPessoalCompleto(row) && temFotoPerfil(row.foto_url);
}

export function camposPerfilPessoalFaltando(row: PerfilPessoalFields): string[] {
  const faltando: string[] = [];
  if (!String(row.nome ?? '').trim()) faltando.push('nome');
  if (!String(row.email ?? '').trim()) faltando.push('e-mail');
  if (!String(row.telefone ?? '').trim()) faltando.push('telefone');
  if (!String(row.endereco ?? '').trim()) faltando.push('endereço');
  if (!String(row.data_nascimento ?? '').trim()) faltando.push('data de nascimento');
  if (!temFotoPerfil(row.foto_url)) faltando.push('foto de perfil');
  return faltando;
}
