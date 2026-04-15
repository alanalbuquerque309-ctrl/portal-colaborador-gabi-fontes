/** Rótulo curto para listagens admin. */
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
      return 'Gerente';
    case 'colaborador':
    default:
      return 'Colaborador';
  }
}
