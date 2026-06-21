import type { SupabaseClient } from '@supabase/supabase-js';

/** Mesma regra dos 5 Grãos «Entrar no portal esta semana» (`login_semana`). */
export async function colaboradorAcessouPortalSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id')
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio)
    .eq('missao', 'login_semana')
    .in('estado', ['pendente', 'confirmado'])
    .limit(1);

  if (error) {
    if (/graos_movimentos/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return false;
    }
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0;
}

/** Lote: ids com crédito login_semana na semana. */
export async function idsComAcessoPortalSemanaGraos(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('colaborador_id')
    .in('colaborador_id', colaboradorIds)
    .eq('semana_inicio', semanaInicio)
    .eq('missao', 'login_semana')
    .in('estado', ['pendente', 'confirmado']);

  if (error) {
    if (/graos_movimentos/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return out;
    }
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    out.add(String(row.colaborador_id));
  }
  return out;
}
