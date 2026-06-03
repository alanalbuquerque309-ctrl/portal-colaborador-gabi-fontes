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
