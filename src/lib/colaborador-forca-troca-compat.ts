import type { SupabaseClient } from '@supabase/supabase-js';

export type ColaboradorLoginRow = {
  id: string;
  unidade_id: string;
  onboarding_completo?: boolean | null;
  role?: string | null;
  senha_hash?: string | null;
  forca_troca_senha?: boolean | null;
};

function isMissingForcaColumnError(err: { message?: string } | null | undefined): boolean {
  const msg = String(err?.message ?? '').toLowerCase();
  return (
    msg.includes('forca_troca_senha') ||
    msg.includes('forca_troca') ||
    msg.includes('schema cache') ||
    msg.includes('could not find') ||
    /column\s+.*does not exist/i.test(msg)
  );
}

/**
 * Lê colaborador para login. Se a coluna `forca_troca_senha` não existir no banco (migration 021 não aplicada),
 * refaz o select sem ela e assume `forca_troca_senha: false`.
 */
export async function selectColaboradorLoginRow(
  supabase: SupabaseClient,
  cleanCpf: string
): Promise<{ data: ColaboradorLoginRow | null; error: { message: string; code?: string } | null }> {
  const full = await supabase
    .from('colaboradores')
    .select('id, unidade_id, onboarding_completo, role, senha_hash, forca_troca_senha')
    .eq('cpf', cleanCpf)
    .maybeSingle();

  if (full.data) {
    return { data: full.data as ColaboradorLoginRow, error: null };
  }

  if (full.error && isMissingForcaColumnError(full.error)) {
    const minimal = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash')
      .eq('cpf', cleanCpf)
      .maybeSingle();
    if (minimal.error && !isMissingForcaColumnError(minimal.error)) {
      return { data: null, error: minimal.error };
    }
    if (minimal.data) {
      return {
        data: { ...minimal.data, forca_troca_senha: false } as ColaboradorLoginRow,
        error: null,
      };
    }
    return { data: null, error: minimal.error ?? null };
  }

  if (full.error) {
    return { data: null, error: full.error };
  }

  return { data: null, error: null };
}

/**
 * Atualiza senha e opcionalmente zera `forca_troca_senha`. Se a coluna não existir, grava só `senha_hash`.
 */
export async function updateSenhaColaboradorCompat(
  supabase: SupabaseClient,
  cleanCpf: string,
  senhaHash: string,
  incluirForcaTrocaFalse: boolean
): Promise<{ error: { message: string } | null }> {
  const updatedAt = new Date().toISOString();
  if (incluirForcaTrocaFalse) {
    const first = await supabase
      .from('colaboradores')
      .update({
        senha_hash: senhaHash,
        forca_troca_senha: false,
        updated_at: updatedAt,
      })
      .eq('cpf', cleanCpf);
    if (!first.error) return { error: null };
    if (isMissingForcaColumnError(first.error)) {
      const second = await supabase
        .from('colaboradores')
        .update({ senha_hash: senhaHash, updated_at: updatedAt })
        .eq('cpf', cleanCpf);
      return { error: second.error };
    }
    return { error: first.error };
  }

  const u = await supabase
    .from('colaboradores')
    .update({ senha_hash: senhaHash, updated_at: updatedAt })
    .eq('cpf', cleanCpf);
  return { error: u.error };
}
