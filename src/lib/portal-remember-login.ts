const KEY_ULTIMO_LOGIN = 'portal_ultimo_login';
const KEY_MANTER_LOGADO = 'portal_manter_logado';

/** Preferência do checkbox (padrão: manter conectado). */
export function lerPreferenciaManterLogado(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(KEY_MANTER_LOGADO) !== '0';
  } catch {
    return true;
  }
}

export function salvarPreferenciaManterLogado(manter: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_MANTER_LOGADO, manter ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Celular ou e-mail usado no último login com “manter conectado”. */
export function lerUltimoLoginSalvo(): string {
  if (typeof window === 'undefined') return '';
  if (!lerPreferenciaManterLogado()) return '';
  try {
    return localStorage.getItem(KEY_ULTIMO_LOGIN) ?? '';
  } catch {
    return '';
  }
}

export function salvarUltimoLogin(login: string, manterLogado: boolean): void {
  if (typeof window === 'undefined') return;
  salvarPreferenciaManterLogado(manterLogado);
  try {
    if (manterLogado && login.trim()) {
      localStorage.setItem(KEY_ULTIMO_LOGIN, login.trim());
    } else {
      localStorage.removeItem(KEY_ULTIMO_LOGIN);
    }
  } catch {
    /* ignore */
  }
}
