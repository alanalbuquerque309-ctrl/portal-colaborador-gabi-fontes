import { normalizePortalRole } from '@/lib/roles';
import { podeGerirSugestoesReclamacoes } from '@/lib/sugestoes-acesso';

/** Fechamento de gorjeta: apenas sócios e administrador (Daniel). */
export function podeVerBonificacaoInterna(role: string | null | undefined): boolean {
  const r = normalizePortalRole(role);
  return r === 'socio' || r === 'admin';
}

/** Reclamações no portal: administração, RH e sócios. */
export function podeEnviarReclamacaoPortal(role: string | null | undefined): boolean {
  return podeGerirSugestoesReclamacoes(role);
}

/** Pendências da semana (rede inteira): só sócios e administrador (Daniel). */
export function podeVerPendenciasSemanaRede(role: string | null | undefined): boolean {
  return podeVerBonificacaoInterna(role);
}
