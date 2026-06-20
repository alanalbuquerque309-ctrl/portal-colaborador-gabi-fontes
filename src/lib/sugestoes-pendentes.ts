import type { SupabaseClient } from '@supabase/supabase-js';

export type SugestaoCamposAnalise = {
  tipo: string;
  visualizado_em?: string | null;
  graos_destaque_em?: string | null;
};

/** Ainda precisa de ação da gestão (badge, filtro «Aguardando análise»). */
export function aguardandoAnaliseAdmin(
  item: SugestaoCamposAnalise,
  opts?: { respostaComGraos?: boolean }
): boolean {
  const tipo = String(item.tipo ?? 'sugestao');
  const respostaComGraos = opts?.respostaComGraos !== false;
  if (tipo === 'sugestao' && respostaComGraos) {
    return item.graos_destaque_em == null;
  }
  return item.visualizado_em == null;
}

/** Mensagens ainda não tratadas pela gestão (sócio/admin). */
export async function contarSugestoesPendentesAnalise(
  supabase: SupabaseClient
): Promise<number> {
  const tentativas = [
    async () => {
      const [sugestoes, elogiosReclamacoes] = await Promise.all([
        supabase
          .from('sugestoes_reclamacoes')
          .select('id', { count: 'exact', head: true })
          .eq('tipo', 'sugestao')
          .is('graos_destaque_em', null),
        supabase
          .from('sugestoes_reclamacoes')
          .select('id', { count: 'exact', head: true })
          .in('tipo', ['elogio', 'reclamacao'])
          .is('visualizado_em', null),
      ]);

      if (sugestoes.error) throw sugestoes.error;
      if (elogiosReclamacoes.error) throw elogiosReclamacoes.error;
      return (sugestoes.count ?? 0) + (elogiosReclamacoes.count ?? 0);
    },
    async () => {
      const { count, error } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'sugestao')
        .is('visualizado_em', null)
        .is('graos_destaque_em', null);
      if (error) throw error;
      return count ?? 0;
    },
    async () => {
      const { count, error } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'sugestao')
        .is('visualizado_em', null);
      if (error) throw error;
      return count ?? 0;
    },
  ];

  for (const run of tentativas) {
    try {
      return await run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/visualizado_em|graos_destaque|does not exist|schema cache/i.test(msg)) continue;
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  return 0;
}
