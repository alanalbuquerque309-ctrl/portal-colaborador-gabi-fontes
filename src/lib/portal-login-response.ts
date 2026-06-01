/**
 * Resposta JSON unificada após telefone+senha validados (portal / primeira-senha).
 */
import { normalizePortalRole } from '@/lib/roles';
export type ColaboradorLoginRow = {
  id: string;
  unidade_id: string;
  role?: string | null;
  onboarding_completo?: boolean | null;
};

export function buildPortalLoginJson(
  col: ColaboradorLoginRow,
  telefoneLogin: string,
  opts?: { cpfPendente?: boolean }
) {
  if (opts?.cpfPendente) {
    return {
      ok: true as const,
      mustCompleteCpf: true as const,
      telefone: telefoneLogin,
      colaborador: {
        id: col.id,
        unidade_id: col.unidade_id,
        role: normalizePortalRole(col.role),
      },
    };
  }

  const role = normalizePortalRole(col.role);
  const onboardingCompleto = !!col.onboarding_completo;

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
