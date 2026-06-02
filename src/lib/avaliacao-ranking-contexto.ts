import type { createAdminClient } from '@/lib/supabase/admin';
import {
  construirConjuntoIdsRh,
  type AvaliacaoSemanaConsolidavel,
} from '@/lib/avaliacao-semanal-agregacao';
import { carregarLiderIdsPorColaboradores } from '@/lib/colaborador-lideres';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type ContextoConsolidacaoRanking = {
  liderIdsPorColaborador: Record<string, Set<string>>;
  rhIds: Set<string>;
  rolePorAvaliador: Map<string, string | null>;
};

export async function montarContextoConsolidacaoRanking(
  supabase: SupabaseAdmin,
  linhas: Array<AvaliacaoSemanaConsolidavel & { colaborador_id: string }>
): Promise<ContextoConsolidacaoRanking> {
  const colaboradorIds = Array.from(
    new Set(linhas.map((l) => String(l.colaborador_id)).filter(Boolean))
  );
  const liderIdsPorColaborador = await carregarLiderIdsPorColaboradores(supabase, colaboradorIds);

  const avaliadorIds = Array.from(
    new Set(linhas.map((l) => String(l.avaliador_id ?? '').trim()).filter(Boolean))
  );

  const metaAvaliador = new Map<string, { role: string | null; setor: string | null; nome: string }>();
  if (avaliadorIds.length > 0) {
    const { data: avaliadores } = await supabase
      .from('colaboradores')
      .select('id, role, setor, nome')
      .in('id', avaliadorIds);
    for (const a of avaliadores ?? []) {
      metaAvaliador.set(String(a.id), {
        role: (a as { role?: string | null }).role ?? null,
        setor: (a as { setor?: string | null }).setor ?? null,
        nome: String(a.nome ?? ''),
      });
    }
  }

  const rhIds = construirConjuntoIdsRh(
    Array.from(metaAvaliador.entries()).map(([id, m]) => ({ id, ...m }))
  );

  const rolePorAvaliador = new Map<string, string | null>();
  metaAvaliador.forEach((m, id) => {
    rolePorAvaliador.set(id, m.role);
  });

  return { liderIdsPorColaborador, rhIds, rolePorAvaliador };
}
