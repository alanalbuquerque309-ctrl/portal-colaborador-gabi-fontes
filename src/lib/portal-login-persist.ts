/** Cookie auxiliar: indica que a sessão do portal foi criada com “manter conectado”. */
export const PORTAL_COOKIE_SESSAO_LONGA = 'portal_sessao_longa';

/** Sessão persistente (manter conectado): 90 dias. */
export const PORTAL_MAX_AGE_PERSISTENT = 60 * 60 * 24 * 90;

/** Admin com sessão longa do portal: 30 dias. */
export const ADMIN_MAX_AGE_PERSISTENT = 60 * 60 * 24 * 30;

/** Admin sem “manter conectado”: 8 horas. */
export const ADMIN_MAX_AGE_CURTA = 60 * 60 * 8;

export function parseManterLogado(body: unknown): boolean {
  if (body && typeof body === 'object' && 'manter_logado' in body) {
    return (body as { manter_logado?: unknown }).manter_logado !== false;
  }
  return true;
}
