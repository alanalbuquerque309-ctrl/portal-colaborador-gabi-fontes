import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import {
  inicioSemanaSegundaFeiraLocal,
  segundaFeiraAnteriorIso,
  semanaAvaliacaoEquipePadraoISO,
} from '@/lib/semana-referencia';

/**
 * Cobrança semanal de avaliação de líder (virada domingo → segunda).
 *
 * - `principal` = semana que terminou no domingo (a que deve ser avaliada nesta semana civil).
 * - `corrente` = segunda da semana que acabou de começar.
 *
 * Enquanto forem diferentes, aceitamos também notas gravadas com `data_referencia` da corrente:
 * líder novo que na segunda escolhe a data errada, mas avalia quem trabalhou na semana anterior.
 * Na próxima virada, só vigoram as pendências da nova semana passada (as antigas “morrem”).
 */
export function semanasReferenciaCobrancaAvaliacaoLider(ref: Date = new Date()): string[] {
  const principal = semanaAvaliacaoEquipePadraoISO();
  const corrente = segundaSemanaSaoPaulo(ref);
  if (corrente === principal) return [principal];
  return [principal, corrente];
}

/** Semana canónica exibida na cobrança (sempre a operacional). */
export function semanaCobrancaAvaliacaoLiderExibicao(): string {
  return semanaAvaliacaoEquipePadraoISO();
}

/**
 * Semana civil dos Grãos (segunda corrente) → `data_referencia` que libera elegibilidade.
 * Inclui a semana operacional anterior + janela de cobrança (virada dom→seg).
 */
export function semanasAvaliacaoOperacionalParaGraos(semanaInicioGraos: string, ref: Date = new Date()): string[] {
  const exib = inicioSemanaSegundaFeiraLocal(semanaInicioGraos);
  const operacional = segundaFeiraAnteriorIso(exib);
  return Array.from(new Set([operacional, exib, ...semanasReferenciaCobrancaAvaliacaoLider(ref)]));
}

/** Semanas em que uma Visita RH já avaliada deve contar como feita na UI de cobrança. */
export function semanasBuscaAvaliacaoRhVisita(dataRefExibicao: string, ref: Date = new Date()): string[] {
  const exibicao = inicioSemanaSegundaFeiraLocal(dataRefExibicao);
  const semanas = semanasReferenciaCobrancaAvaliacaoLider(ref);
  return Array.from(new Set([exibicao, ...semanas]));
}

/** Escolhe a linha de Visita RH a exibir quando há notas em semanas adjacentes de cobrança. */
export function preferirAvaliacaoRhVisitaExibicao<T extends { data_referencia?: string | null }>(
  novo: T,
  atual: T,
  dataRefExibicao: string
): boolean {
  const drNovo = inicioSemanaSegundaFeiraLocal(String(novo.data_referencia ?? ''));
  const drAtual = inicioSemanaSegundaFeiraLocal(String(atual.data_referencia ?? ''));
  const exib = inicioSemanaSegundaFeiraLocal(dataRefExibicao);
  if (drNovo === exib && drAtual !== exib) return true;
  if (drAtual === exib && drNovo !== exib) return false;
  return drNovo > drAtual;
}
