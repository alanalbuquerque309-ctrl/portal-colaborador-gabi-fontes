/** Rótulo curto para listagens admin (mantém legado master). */
export function labelAcessoPortal(role: string | null | undefined): string {
  const r = (role || 'colaborador').trim().toLowerCase();
  switch (r) {
    case 'socio':
      return 'Sócio';
    case 'admin':
      return 'Administrador';
    case 'gerente':
      return 'Gerente';
    case 'master':
      return 'Gerente (legado)';
    case 'colaborador':
    default:
      return 'Colaborador';
  }
}
