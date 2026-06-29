import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePortalRole, podeParticiparGraosCafe } from '@/lib/roles';

export type SugestaoCamposAnalise = {
  tipo: string;
  visualizado_em?: string | null;
  graos_destaque_em?: string | null;
  resposta_texto?: string | null;
  /** Quando false, basta marcar como visto (líderes fora do programa Grãos). */
  autor_participa_graos?: boolean;
};

/** Ainda precisa de ação da gestão (badge, filtro «Aguardando análise»). */
export function aguardandoAnaliseAdmin(
  item: SugestaoCamposAnalise,
  opts?: { respostaComGraos?: boolean }
): boolean {
  if (item.resposta_texto?.trim()) return false;
  const tipo = String(item.tipo ?? 'sugestao');
  const respostaComGraos = opts?.respostaComGraos !== false;
  const autorGrãos = item.autor_participa_graos !== false;
  if (tipo === 'sugestao' && respostaComGraos && autorGrãos) {
    return item.graos_destaque_em == null;
  }
  return item.visualizado_em == null;
}

async function mapaRolesColaboradores(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (unicos.length === 0) return map;
  const { data } = await supabase.from('colaboradores').select('id, role').in('id', unicos);
  for (const c of data ?? []) {
    map.set(String((c as { id: string }).id), normalizePortalRole((c as { role?: string }).role));
  }
  return map;
}

function sugestaoPendenteAnalise(
  row: {
    colaborador_id?: string | null;
    visualizado_em?: string | null;
    graos_destaque_em?: string | null;
    resposta_texto?: string | null;
  },
  roles: Map<string, string>
): boolean {
  if (row.resposta_texto?.trim()) return false;
  if (row.graos_destaque_em != null) return false;
  const cid = row.colaborador_id ? String(row.colaborador_id) : '';
  const role = cid ? roles.get(cid) : undefined;
  if (role && !podeParticiparGraosCafe(role)) {
    return row.visualizado_em == null;
  }
  return true;
}

/** Mensagens ainda não tratadas pela gestão (sócio/admin). */
export async function contarSugestoesPendentesAnalise(
  supabase: SupabaseClient
): Promise<number> {
  const tentativas = [
    async () => {
      const [sugestoesRaw, elogiosReclamacoes] = await Promise.all([
        supabase
          .from('sugestoes_reclamacoes')
          .select('id, colaborador_id, visualizado_em, graos_destaque_em, resposta_texto')
          .eq('tipo', 'sugestao')
          .is('graos_destaque_em', null)
          .limit(500),
        supabase
          .from('sugestoes_reclamacoes')
          .select('id', { count: 'exact', head: true })
          .in('tipo', ['elogio', 'reclamacao'])
          .is('visualizado_em', null)
          .is('resposta_texto', null),
      ]);

      if (sugestoesRaw.error) throw sugestoesRaw.error;
      if (elogiosReclamacoes.error) throw elogiosReclamacoes.error;

      const rows = (sugestoesRaw.data ?? []) as Array<{
        colaborador_id?: string | null;
        visualizado_em?: string | null;
        graos_destaque_em?: string | null;
        resposta_texto?: string | null;
      }>;
      const roles = await mapaRolesColaboradores(
        supabase,
        rows.map((r) => String(r.colaborador_id ?? ''))
      );
      const sugestoesPendentes = rows.filter((r) => sugestaoPendenteAnalise(r, roles)).length;
      return sugestoesPendentes + (elogiosReclamacoes.count ?? 0);
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
      if (/visualizado_em|graos_destaque|resposta_texto|does not exist|schema cache/i.test(msg)) continue;
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  return 0;
}
