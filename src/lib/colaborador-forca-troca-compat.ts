import type { SupabaseClient } from '@supabase/supabase-js';

export type ColaboradorLoginRow = {
  id: string;
  unidade_id: string;
  onboarding_completo?: boolean | null;
  role?: string | null;
  senha_hash?: string | null;
  forca_troca_senha?: boolean | null;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
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

function isMissingTelefoneLoginColumnError(err: { message?: string } | null | undefined): boolean {
  const msg = String(err?.message ?? '').toLowerCase();
  return msg.includes('telefone_login') && (msg.includes('does not exist') || msg.includes('schema cache'));
}

/**
 * Lê colaborador para login por `telefone_login` (normalizado).
 * Se a coluna `forca_troca_senha` não existir, refaz o select sem ela.
 */
export async function selectColaboradorLoginRowByTelefoneLogin(
  supabase: SupabaseClient,
  telefoneLogin: string
): Promise<{ data: ColaboradorLoginRow | null; error: { message: string; code?: string } | null }> {
  const full = await supabase
    .from('colaboradores')
    .select('id, unidade_id, onboarding_completo, role, senha_hash, forca_troca_senha, cpf, telefone, email')
    .eq('telefone_login', telefoneLogin)
    .maybeSingle();

  if (full.error && isMissingTelefoneLoginColumnError(full.error)) {
    return {
      data: null,
      error: {
        message:
          'Coluna telefone_login não encontrada. Aplique a migration 023 (telefone_login) no Supabase.',
      },
    };
  }

  if (full.data) {
    return { data: full.data as ColaboradorLoginRow, error: null };
  }

  if (full.error && isMissingForcaColumnError(full.error)) {
    const minimal = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash, cpf, telefone, email')
      .eq('telefone_login', telefoneLogin)
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

function normalizeTelefoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d;
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Resolve login do portal por telefone (com fallback para coluna `telefone`) ou por e-mail.
 * Retorna o `loginCanonical` para reaproveitar no fluxo de primeira senha/troca obrigatória.
 */
export async function selectColaboradorLoginRowByLogin(
  supabase: SupabaseClient,
  login: string
): Promise<{
  data: ColaboradorLoginRow | null;
  loginCanonical: string | null;
  error: { message: string; code?: string } | null;
}> {
  const raw = login.trim();
  if (!raw) {
    return { data: null, loginCanonical: null, error: { message: 'Informe celular ou e-mail.' } };
  }

  if (raw.includes('@')) {
    const email = normalizeEmail(raw);
    const byEmail = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash, forca_troca_senha, cpf, telefone, email')
      .ilike('email', email)
      .maybeSingle();

    if (byEmail.error && isMissingForcaColumnError(byEmail.error)) {
      const retry = await supabase
        .from('colaboradores')
        .select('id, unidade_id, onboarding_completo, role, senha_hash, cpf, telefone, email')
        .ilike('email', email)
        .maybeSingle();
      if (retry.error) return { data: null, loginCanonical: null, error: retry.error };
      if (!retry.data) return { data: null, loginCanonical: null, error: null };
      return {
        data: { ...retry.data, forca_troca_senha: false } as ColaboradorLoginRow,
        loginCanonical: email,
        error: null,
      };
    }
    if (byEmail.error) return { data: null, loginCanonical: null, error: byEmail.error };
    return { data: (byEmail.data as ColaboradorLoginRow | null) ?? null, loginCanonical: email, error: null };
  }

  const telefone = normalizeTelefoneDigits(raw);
  if (!telefone) {
    return { data: null, loginCanonical: null, error: { message: 'Informe celular ou e-mail válidos.' } };
  }

  const byTelefoneLogin = await selectColaboradorLoginRowByTelefoneLogin(supabase, telefone);
  if (byTelefoneLogin.data) {
    return { data: byTelefoneLogin.data, loginCanonical: telefone, error: null };
  }
  if (
    byTelefoneLogin.error &&
    String(byTelefoneLogin.error.message).toLowerCase().includes('telefone_login')
  ) {
    const byTelefoneExato = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash, forca_troca_senha, cpf, telefone, email')
      .eq('telefone', telefone)
      .maybeSingle();
    if (byTelefoneExato.error && isMissingForcaColumnError(byTelefoneExato.error)) {
      const retry = await supabase
        .from('colaboradores')
        .select('id, unidade_id, onboarding_completo, role, senha_hash, cpf, telefone, email')
        .eq('telefone', telefone)
        .maybeSingle();
      if (retry.error) return { data: null, loginCanonical: null, error: retry.error };
      if (!retry.data) return { data: null, loginCanonical: null, error: null };
      return {
        data: { ...retry.data, forca_troca_senha: false } as ColaboradorLoginRow,
        loginCanonical: telefone,
        error: null,
      };
    }
    if (byTelefoneExato.error) return { data: null, loginCanonical: null, error: byTelefoneExato.error };
    if (byTelefoneExato.data) {
      return {
        data: byTelefoneExato.data as ColaboradorLoginRow,
        loginCanonical: telefone,
        error: null,
      };
    }

    // Fallback robusto para bases antigas: compara telefone normalizado em memória.
    const byTelefoneLista = await supabase
      .from('colaboradores')
      .select('id, unidade_id, onboarding_completo, role, senha_hash, forca_troca_senha, cpf, telefone, email')
      .not('telefone', 'is', null);
    if (byTelefoneLista.error && isMissingForcaColumnError(byTelefoneLista.error)) {
      const retry = await supabase
        .from('colaboradores')
        .select('id, unidade_id, onboarding_completo, role, senha_hash, cpf, telefone, email')
        .not('telefone', 'is', null);
      if (retry.error) return { data: null, loginCanonical: null, error: retry.error };
      const found = (retry.data ?? []).find(
        (r) => normalizeTelefoneDigits(String((r as { telefone?: string | null }).telefone ?? '')) === telefone
      );
      if (!found) return { data: null, loginCanonical: null, error: null };
      return {
        data: { ...(found as ColaboradorLoginRow), forca_troca_senha: false },
        loginCanonical: telefone,
        error: null,
      };
    }
    if (byTelefoneLista.error) return { data: null, loginCanonical: null, error: byTelefoneLista.error };
    const found = (byTelefoneLista.data ?? []).find(
      (r) => normalizeTelefoneDigits(String((r as { telefone?: string | null }).telefone ?? '')) === telefone
    );
    if (!found) return { data: null, loginCanonical: null, error: null };
    return {
      data: found as ColaboradorLoginRow,
      loginCanonical: telefone,
      error: null,
    };
  }

  return {
    data: byTelefoneLogin.data,
    loginCanonical: telefone,
    error: byTelefoneLogin.error,
  };
}

/**
 * Atualiza senha por id e opcionalmente zera `forca_troca_senha`.
 */
export async function updateSenhaColaboradorByIdCompat(
  supabase: SupabaseClient,
  colaboradorId: string,
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
      .eq('id', colaboradorId);
    if (!first.error) return { error: null };
    if (isMissingForcaColumnError(first.error)) {
      const second = await supabase
        .from('colaboradores')
        .update({ senha_hash: senhaHash, updated_at: updatedAt })
        .eq('id', colaboradorId);
      return { error: second.error };
    }
    return { error: first.error };
  }

  const u = await supabase
    .from('colaboradores')
    .update({ senha_hash: senhaHash, updated_at: updatedAt })
    .eq('id', colaboradorId);
  return { error: u.error };
}
