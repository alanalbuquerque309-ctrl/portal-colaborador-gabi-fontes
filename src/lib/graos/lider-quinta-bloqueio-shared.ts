/**
 * Helpers puros (sem DB / server-only) — seguros para Client Components.
 */

/**
 * Trava dura de quinta (só Avaliação da equipe): gerentes/masters de loja.
 * Admin (Daniel) e sócios não entram — precisam usar Treinamento, Admin e o resto do portal.
 */
export function roleAplicaBloqueioQuintaHard(role: string | null | undefined): boolean {
  return role === 'gerente' || role === 'master';
}

/** Rotas liberadas mesmo com bloqueio de quinta (além de Avaliação da equipe). */
export function rotaLiberadaComBloqueioQuinta(pathname: string): boolean {
  if (pathname === '/portal/avaliacao-master') return true;
  if (pathname === '/portal/treinamento' || pathname.startsWith('/portal/treinamento/')) return true;
  return false;
}
