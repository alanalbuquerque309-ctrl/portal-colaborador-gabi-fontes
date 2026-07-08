import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';

/** Marcador gravado em justificativa_nota_baixa (assiduidade no banco = falta_justificada). */
export const JUSTIFICATIVA_FORA_PLANTAO =
  'Fora do plantão deste líder (outro líder avalia nesta semana).';

/** Marcador de férias (assiduidade no banco = falta_justificada → média isenta/null). */
export const JUSTIFICATIVA_FERIAS = 'Colaborador de férias nesta semana (não entra na média).';

/** Marcador de licença / afastamento (semana sem nota, fora das pendências). */
export const JUSTIFICATIVA_LICENCA_SEMANA =
  'Licença médica / afastamento nesta semana (não entra na média).';

export function assiduidadeParaBanco(
  s: AssiduidadeTipo
): 'presente' | 'falta_justificada' | 'falta_injustificada' {
  if (s === 'folga' || s === 'outra_escala' || s === 'fora_plantao' || s === 'ferias') {
    return 'falta_justificada';
  }
  return s;
}

function normJustificativaFerias(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function justificativaIndicaFerias(justificativa?: string | null): boolean {
  const j = String(justificativa ?? '').trim();
  if (!j) return false;
  if (j === JUSTIFICATIVA_FERIAS) return true;
  const t = normJustificativaFerias(j);
  return (
    (t.includes('colaborador de ferias') || t.includes('de ferias nesta semana')) &&
    (t.includes('nao entra na media') || t.includes('nesta semana'))
  );
}

/** Reconstrói o tipo da UI a partir do que está no Postgres. */
export function assiduidadeDoBanco(
  stored: string | null | undefined,
  justificativa?: string | null
): AssiduidadeTipo {
  const s = String(stored ?? '').trim();
  const j = String(justificativa ?? '').trim();
  if (s === 'falta_justificada' && j === JUSTIFICATIVA_FORA_PLANTAO) return 'fora_plantao';
  if (s === 'falta_justificada' && justificativaIndicaFerias(j)) return 'ferias';
  if (s === 'presente' || s === 'falta_injustificada' || s === 'falta_justificada') return s;
  return 'presente';
}

export function ehForaPlantaoAvaliacao(
  stored: string | null | undefined,
  justificativa?: string | null
): boolean {
  return assiduidadeDoBanco(stored, justificativa) === 'fora_plantao';
}

export function ehFeriasAvaliacao(
  stored: string | null | undefined,
  justificativa?: string | null
): boolean {
  return assiduidadeDoBanco(stored, justificativa) === 'ferias';
}

function normJustificativaLicenca(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Licença ou afastamento registrado na semana (UI ou marcador de rede). */
export function justificativaIndicaLicencaOuAfastamento(justificativa?: string | null): boolean {
  const j = String(justificativa ?? '').trim();
  if (!j) return false;
  if (j === JUSTIFICATIVA_LICENCA_SEMANA) return true;
  const t = normJustificativaLicenca(j);
  return t.includes('licenca') || t.includes('afastamento');
}

export function ehLicencaOuAfastamentoAvaliacao(
  _stored: string | null | undefined,
  justificativa?: string | null
): boolean {
  return justificativaIndicaLicencaOuAfastamento(justificativa);
}

export function isDateIsoAvaliacao(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
