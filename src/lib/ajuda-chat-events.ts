/** Disparado após responder ou apagar mensagem no canal de ajuda (atualiza contadores). */
export const AJUDA_CHAT_ATUALIZADO = 'ajuda-chat-atualizado';

export function emitAjudaChatAtualizado(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AJUDA_CHAT_ATUALIZADO));
  }
}
