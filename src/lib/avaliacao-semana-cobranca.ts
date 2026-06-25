import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';

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
