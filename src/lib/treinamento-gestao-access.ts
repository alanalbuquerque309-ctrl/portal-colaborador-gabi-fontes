import { podeGerirSugestoesReclamacoes } from '@/lib/sugestoes-acesso';

/** Acompanha quem assistiu aos treinamentos: admin, RH e sócios. */
export function podeAcompanharTreinamentosGestao(role: string | null | undefined): boolean {
  return podeGerirSugestoesReclamacoes(role);
}
