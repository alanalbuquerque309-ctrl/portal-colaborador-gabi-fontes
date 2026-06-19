import { GRAOS_PRIMEIRA_SEMANA_INICIO } from '@/lib/graos/constants';

/** Semana civil (segunda YYYY-MM-DD) já entrou no piloto de Grãos. */
export function semanaVigenteParaGraos(semanaInicio: string | null | undefined): boolean {
  const s = String(semanaInicio ?? '').trim();
  if (!s) return true;
  return s >= GRAOS_PRIMEIRA_SEMANA_INICIO;
}

/** Semana efetiva para crédito: antes do piloto retorna null (não credita). */
export function semanaInicioParaCreditoGraos(semanaInicio: string): string | null {
  return semanaVigenteParaGraos(semanaInicio) ? semanaInicio : null;
}
