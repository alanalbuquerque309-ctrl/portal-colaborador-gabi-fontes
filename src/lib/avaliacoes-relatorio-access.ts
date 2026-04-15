/** Relatórios consolidados (equipe + liderança): apenas sócios no portal. Administradores usam o painel /admin. */
export function podeVerRelatoriosAvaliacoesCompletos(role: string | null | undefined): boolean {
  const r = (role || '').trim().toLowerCase();
  return r === 'socio';
}
