import { avisoVisivelNaSemanaAtual } from '@/lib/avisos-vigencia';

/** Elogio visível na rede até virar a semana (segunda-feira), mesma regra civil seg–dom. */
export function elogioVisivelNaSemanaCivil(
  createdAt: string | null | undefined,
  ref: Date = new Date()
): boolean {
  return avisoVisivelNaSemanaAtual(createdAt, ref);
}

export type AutorElogioFeed = {
  anonimo: boolean;
  autor: string;
  autor_setor: string | null;
  autor_unidade: string | null;
};

export function linhaAutorElogio(item: AutorElogioFeed): string {
  if (item.anonimo) return 'Anônimo';
  return [item.autor, item.autor_setor, item.autor_unidade].filter(Boolean).join(' · ');
}
