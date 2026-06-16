/** Disparado após enviar sugestão ou gestão marcar visto/destaque (atualiza contadores). */
export const SUGESTOES_ATUALIZADO = 'sugestoes-atualizado';

export function emitSugestoesAtualizado(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SUGESTOES_ATUALIZADO));
  }
}
