const STORAGE_KEY = 'portal_ultima_visita_home';

export function lerUltimaVisitaHome(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v?.trim() ? v : null;
  } catch {
    return null;
  }
}

export function gravarUltimaVisitaHome(iso = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    /* ignore */
  }
}
