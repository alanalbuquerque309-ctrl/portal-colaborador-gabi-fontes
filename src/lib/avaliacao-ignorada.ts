/** Avaliação marcada como ignorada pelo admin: permanece no banco, não entra em médias agregadas. */

export const AVALIACAO_IGNORAR_MOTIVO_MIN = 8;
export const AVALIACAO_IGNORAR_MOTIVO_MAX = 500;

export type CamposIgnoradaAvaliacao = {
  ignorada?: boolean | null;
  ignorada_em?: string | null;
  ignorada_motivo?: string | null;
};

export function avaliacaoEstaIgnorada(row: CamposIgnoradaAvaliacao | null | undefined): boolean {
  return row?.ignorada === true;
}

export function avaliacaoContaNaMedia(row: CamposIgnoradaAvaliacao | null | undefined): boolean {
  return !avaliacaoEstaIgnorada(row);
}

export function filtrarAvaliacoesParaMedia<T>(rows: T[]): T[] {
  return rows.filter((r) => avaliacaoContaNaMedia(r as CamposIgnoradaAvaliacao));
}

/** Remove a coluna `ignorada` de uma lista de colunas (fallback p/ migration 040 não aplicada). */
export function colunasSemIgnorada(cols: string): string {
  return cols
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && c.toLowerCase() !== 'ignorada')
    .join(', ');
}

/** `true` se o erro for da coluna `ignorada` ausente (migration 040 pendente). */
export function erroColunaIgnoradaAusente(msg: string | null | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('ignorada') &&
    (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'))
  );
}

export function sanitizeMotivoIgnorarAvaliacao(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function validarMotivoIgnorarAvaliacao(motivo: string): string | null {
  if (motivo.length < AVALIACAO_IGNORAR_MOTIVO_MIN) {
    return `Informe o motivo (mín. ${AVALIACAO_IGNORAR_MOTIVO_MIN} caracteres).`;
  }
  if (motivo.length > AVALIACAO_IGNORAR_MOTIVO_MAX) {
    return `Motivo muito longo (máx. ${AVALIACAO_IGNORAR_MOTIVO_MAX} caracteres).`;
  }
  return null;
}
