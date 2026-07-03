/** Colaboradores em regime remoto / home office: fora da avaliação semanal de equipe e de Grãos. */

export type ColaboradorRegimeOperacao = {
  tipo_escala?: string | null;
};

function normalizarTipoEscala(valor: string | null | undefined): string {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '');
}

export function colaboradorEmRegimeHomeOffice(col: ColaboradorRegimeOperacao | null | undefined): boolean {
  const t = normalizarTipoEscala(col?.tipo_escala);
  return t === 'homeoffice' || t === 'remoto';
}

export function colaboradorForaAvaliacaoSemanalEquipe(col: ColaboradorRegimeOperacao | null | undefined): boolean {
  return colaboradorEmRegimeHomeOffice(col);
}

export function colaboradorForaGraosCafe(col: ColaboradorRegimeOperacao | null | undefined): boolean {
  return colaboradorEmRegimeHomeOffice(col);
}
