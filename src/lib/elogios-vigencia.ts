import { semanaPublicacaoAviso } from '@/lib/avisos-vigencia';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';

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

/** Segunda-feira (SP) em que o elogio deixa de aparecer para quem ainda não marcou lido. */
export function segundaExpiracaoElogioRede(createdAt: string | null | undefined): string | null {
  const semanaPub = semanaPublicacaoAviso(createdAt);
  if (!semanaPub) return null;
  const [y, m, d] = semanaPub.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + 14);
  const ys = dt.getFullYear();
  const ms = String(dt.getMonth() + 1).padStart(2, '0');
  const ds = String(dt.getDate()).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

/**
 * Elogio ainda no ar na rede: semana de publicação + semana seguinte inteira.
 * Ex.: publicado na semana de 29/06 → some na segunda 13/07 para quem não marcou lido.
 */
export function elogioVisivelNoPrazoRede(
  createdAt: string | null | undefined,
  ref: Date = new Date()
): boolean {
  const expira = segundaExpiracaoElogioRede(createdAt);
  if (!expira) return false;
  return segundaSemanaSaoPaulo(ref) < expira;
}

/** @deprecated use elogioVisivelNoPrazoRede */
export function elogioVisivelNaSemanaCivil(
  createdAt: string | null | undefined,
  ref: Date = new Date()
): boolean {
  return elogioVisivelNoPrazoRede(createdAt, ref);
}

export function rotuloExpiracaoElogio(createdAt: string | null | undefined): string {
  const expira = segundaExpiracaoElogioRede(createdAt);
  if (!expira) return '';
  const [y, m, d] = expira.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}
