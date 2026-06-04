import type { SupabaseClient } from '@supabase/supabase-js';
import { isPerfilPessoalCompleto } from '@/lib/perfil-completo';

/** Lê campos do cadastro pessoal e indica se o portal pode ser liberado. */
export async function perfilPessoalCompletoPorId(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('nome, endereco, telefone, email, data_nascimento')
    .eq('id', colaboradorId)
    .maybeSingle();

  if (error || !data) return false;
  return isPerfilPessoalCompleto(data);
}
