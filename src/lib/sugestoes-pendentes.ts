import type { SupabaseClient } from '@supabase/supabase-js';

/** Sugestões ainda não vistas pela gestão (sócio/admin). */
export async function contarSugestoesPendentesAnalise(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from('sugestoes_reclamacoes')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'sugestao')
    .is('visualizado_em', null);

  if (error) {
    if (/graos_destaque|visualizado_em|does not exist/i.test(error.message)) {
      return 0;
    }
    throw new Error(error.message);
  }

  return count ?? 0;
}
