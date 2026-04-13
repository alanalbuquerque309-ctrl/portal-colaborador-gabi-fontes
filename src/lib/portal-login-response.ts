/**
 * Resposta JSON unificada após CPF+senha validados (portal / primeira-senha).
 */
export type ColaboradorLoginRow = {
  id: string;
  unidade_id: string;
  role?: string | null;
  onboarding_completo?: boolean | null;
};

export function buildPortalLoginJson(col: ColaboradorLoginRow, cleanCpf: string) {
  const role = col.role || 'colaborador';
  const onboardingCompleto = !!col.onboarding_completo;

  if (!onboardingCompleto && (role === 'socio' || role === 'admin')) {
    return {
      ok: true as const,
      action: 'socio_admin' as const,
      cpf: cleanCpf,
      colaborador: { id: col.id, unidade_id: col.unidade_id, role },
    };
  }

  if (!onboardingCompleto) {
    return {
      ok: true as const,
      redirect: `/onboarding?colaborador_id=${col.id}&unidade_id=${col.unidade_id}`,
      colaborador: { id: col.id, unidade_id: col.unidade_id, role },
    };
  }

  return {
    ok: true as const,
    colaborador: { id: col.id, unidade_id: col.unidade_id, role },
    redirect: '/portal',
  };
}
