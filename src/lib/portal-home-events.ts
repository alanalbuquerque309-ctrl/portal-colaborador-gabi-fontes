/** Disparado após confirmar comunicado, concluir pendência, etc. — home refaz home-resumo. */
export const PORTAL_HOME_ATUALIZADO = 'portal-home-atualizado';

export function emitPortalHomeAtualizado() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PORTAL_HOME_ATUALIZADO));
}
