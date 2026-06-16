import { GRAOS_NIVEL_FAIXAS } from '@/lib/graos/constants';

export function nivelGraosPorTotal(totalConfirmadoGanho: number) {
  const t = Math.max(0, totalConfirmadoGanho);
  for (const faixa of GRAOS_NIVEL_FAIXAS) {
    if (t >= faixa.min && t <= faixa.max) return faixa;
  }
  return GRAOS_NIVEL_FAIXAS[GRAOS_NIVEL_FAIXAS.length - 1];
}
