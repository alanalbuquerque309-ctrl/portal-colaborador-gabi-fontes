import type { SupabaseClient } from '@supabase/supabase-js';

/** Sugestões ainda não vistas pela gestão (sócio/admin). */
export async function contarSugestoesPendentesAnalise(
  supabase: SupabaseClient
): Promise<number> {
  const tentativas = [
    () =>
      supabase
        .from('sugestoes_reclamacoes')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'sugestao')
        .is('visualizado_em', null),
    () =>
      supabase
        .from('sugestoes_reclamacoes')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'sugestao'),
  ];

  for (const run of tentativas) {
    const { count, error } = await run();
    if (!error) return count ?? 0;
    if (/visualizado_em|does not exist|schema cache/i.test(error.message)) continue;
    throw new Error(error.message);
  }

  return 0;
}
