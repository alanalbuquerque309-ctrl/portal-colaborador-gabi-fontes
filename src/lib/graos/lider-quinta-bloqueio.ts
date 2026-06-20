import type { SupabaseClient } from '@supabase/supabase-js';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import { selectAvaliacoesDiariasPorColaboradores } from '@/lib/avaliacoes-justificativa-compat';
import { idsColaboradoresDeFeriasNaSemana } from '@/lib/avaliacao-ferias-semana';
import { ehQuintaSaoPaulo } from '@/lib/semana-brasil';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';

export type LiderBloqueioQuinta = {
  bloqueado: boolean;
  pendentes: number;
  motivo: string | null;
};

/** Quinta: líder com avaliações pendentes da semana só acessa Avaliação da equipe. */
export async function verificarBloqueioQuintaLider(
  supabase: SupabaseClient,
  liderId: string,
  unidadeId: string
): Promise<LiderBloqueioQuinta> {
  if (!ehQuintaSaoPaulo()) {
    return { bloqueado: false, pendentes: 0, motivo: null };
  }

  const dataRef = inicioSemanaSegundaFeiraLocal(new Date().toISOString().slice(0, 10));
  const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, liderId, unidadeId);
  const ids = equipe.map((c) => c.id);
  if (ids.length === 0) {
    return { bloqueado: false, pendentes: 0, motivo: null };
  }

  const { rows } = await selectAvaliacoesDiariasPorColaboradores(
    supabase,
    dataRef,
    ids,
    liderId
  );

  const feriasIds = await idsColaboradoresDeFeriasNaSemana(supabase, ids, dataRef);

  let pendentes = 0;
  for (const membro of equipe) {
    if (feriasIds.has(membro.id)) continue;
    const row = rows.find((r) => String(r.colaborador_id) === membro.id);
    if (!row) pendentes += 1;
  }

  if (pendentes <= 0) {
    return { bloqueado: false, pendentes: 0, motivo: null };
  }

  return {
    bloqueado: true,
    pendentes,
    motivo: `Quinta-feira: avalie sua equipe (${pendentes} pendente(s)) para liberar o portal.`,
  };
}
