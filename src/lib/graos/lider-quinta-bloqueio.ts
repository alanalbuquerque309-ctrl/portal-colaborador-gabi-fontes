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

/**
 * Trava dura de quinta (só Avaliação da equipe): gerentes/masters de loja.
 * Admin (Daniel) e sócios não entram — precisam usar Treinamento, Admin e o resto do portal.
 */
export function roleAplicaBloqueioQuintaHard(role: string | null | undefined): boolean {
  return role === 'gerente' || role === 'master';
}

/** Rotas liberadas mesmo com bloqueio de quinta (além de Avaliação da equipe). */
export function rotaLiberadaComBloqueioQuinta(pathname: string): boolean {
  if (pathname === '/portal/avaliacao-master') return true;
  if (pathname === '/portal/treinamento' || pathname.startsWith('/portal/treinamento/')) return true;
  return false;
}

/** Quinta: líder de loja com avaliações pendentes — só Avaliação (e Treinamento). */
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
