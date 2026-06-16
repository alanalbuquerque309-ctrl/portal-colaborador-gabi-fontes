/** Grãos pela missão de troféus na semana: 1→1, 2→2, 3+→5. */
export function graosPorTrofeusEnviadosNaSemana(qtd: number): number {
  if (qtd <= 0) return 0;
  if (qtd === 1) return 1;
  if (qtd === 2) return 2;
  return 5;
}
