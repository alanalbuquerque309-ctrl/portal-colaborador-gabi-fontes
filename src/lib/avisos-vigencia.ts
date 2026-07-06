import { inicioCicloTreinoQuintaIsoSp, segundaSemanaSaoPaulo } from '@/lib/semana-brasil';

/** Segunda-feira (SP) da semana em que o aviso foi publicado. */
export function semanaPublicacaoAviso(dataPublicacao: string | null | undefined): string | null {
  if (!dataPublicacao) return null;
  const raw = String(dataPublicacao).trim();
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return segundaSemanaSaoPaulo(d);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (!m) return null;
  const [y, mo, day] = m[1].split('-').map((x) => parseInt(x, 10));
  return segundaSemanaSaoPaulo(new Date(y, mo - 1, day));
}

/** Aviso visível no portal só na semana civil (seg–dom) da publicação. */
export function avisoVisivelNaSemanaAtual(
  dataPublicacao: string | null | undefined,
  ref: Date = new Date()
): boolean {
  const semanaAviso = semanaPublicacaoAviso(dataPublicacao);
  if (!semanaAviso) return false;
  return semanaAviso === segundaSemanaSaoPaulo(ref);
}

/**
 * Aviso visível no mural: semana civil da publicação OU mesmo ciclo quinta (qui–qua).
 * Evita sumir na segunda-feira enquanto o treino da semana ainda está vigente.
 */
export function avisoVisivelNoPortal(
  dataPublicacao: string | null | undefined,
  ref: Date = new Date()
): boolean {
  if (avisoVisivelNaSemanaAtual(dataPublicacao, ref)) return true;
  if (!dataPublicacao) return false;
  const d = new Date(String(dataPublicacao));
  if (Number.isNaN(d.getTime())) return false;
  return inicioCicloTreinoQuintaIsoSp(d) === inicioCicloTreinoQuintaIsoSp(ref);
}
