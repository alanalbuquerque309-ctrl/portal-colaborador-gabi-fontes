/** Disparado após confirmar / concluir treino — Header atualiza o badge. */
export const TREINAMENTO_PENDENCIAS_ATUALIZADO = 'treinamento-pendencias-atualizado';

export function emitTreinamentoPendenciasAtualizado(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TREINAMENTO_PENDENCIAS_ATUALIZADO));
}
