import type { SupabaseClient } from '@supabase/supabase-js';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import { selectAvaliacoesDiariasPorColaboradores } from '@/lib/avaliacoes-justificativa-compat';
import { ehQuintaSaoPaulo } from '@/lib/semana-brasil';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';

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

  const avaliados = new Set(rows.map((r) => String(r.colaborador_id)));
  let pendentes = 0;

  for (const membro of equipe) {
    const row = rows.find((r) => String(r.colaborador_id) === membro.id);
    if (!row) {
      pendentes += 1;
      continue;
    }
    const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);
    if (a === 'fora_plantao') continue;
    if (!avaliados.has(membro.id)) pendentes += 1;
  }

  // Recount: pending = no row from THIS leader for this week
  pendentes = 0;
  for (const membro of equipe) {
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
