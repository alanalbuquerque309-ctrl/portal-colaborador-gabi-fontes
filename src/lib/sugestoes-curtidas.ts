import type { createAdminClient } from '@/lib/supabase/admin';

/** Atualiza o campo agregado `curtidas` em `sugestoes_reclamacoes`. */
export async function sincronizarCurtidas(
  supabase: ReturnType<typeof createAdminClient>,
  sugestaoId: string
): Promise<void> {
  const { count, error: countErr } = await supabase
    .from('sugestao_curtidas')
    .select('*', { count: 'exact', head: true })
    .eq('sugestao_id', sugestaoId);
  if (countErr) return;
  await supabase
    .from('sugestoes_reclamacoes')
    .update({ curtidas: count ?? 0 })
    .eq('id', sugestaoId);
}
