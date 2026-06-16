import type { SupabaseClient } from '@supabase/supabase-js';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';

export type GraosEstadoSemana =
  | 'aguardando_lider'
  | 'aguardando_outro_lider'
  | 'ferias'
  | 'inelegivel'
  | 'elegivel';

export type GraosElegibilidadeSemana = {
  estado: GraosEstadoSemana;
  motivo: string | null;
  elegivel: boolean;
  avaliacao_id: string | null;
};

type AvaliacaoRow = {
  id: string;
  assiduidade: string;
  justificativa_nota_baixa?: string | null;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  nota_proatividade?: number | null;
  updated_at?: string | null;
};

function notaBloqueiaGraos(n: number | null | undefined): boolean {
  if (n == null || Number.isNaN(Number(n))) return false;
  return Number(n) <= 2;
}

function criteriosBloqueiam(a: AssiduidadeTipo, row: AvaliacaoRow): string | null {
  if (notaBloqueiaGraos(row.nota_pontualidade)) return 'Pontualidade 2 ou menor (atraso).';
  if (notaBloqueiaGraos(row.nota_vestimenta)) return 'Nota de vestimenta 2 ou menor.';
  if (notaBloqueiaGraos(row.nota_trabalho_equipe)) return 'Nota de trabalho em equipe 2 ou menor.';
  if (notaBloqueiaGraos(row.nota_desempenho_tarefas)) return 'Nota de desempenho 2 ou menor.';
  if (notaBloqueiaGraos(row.nota_proatividade)) return 'Nota de proatividade 2 ou menor.';
  return null;
}

export function avaliarElegibilidadeDeLinha(row: AvaliacaoRow | null): GraosElegibilidadeSemana {
  if (!row) {
    return {
      estado: 'aguardando_lider',
      motivo: 'Seu líder ainda não te avaliou esta semana. Você pode cobrar a avaliação.',
      elegivel: false,
      avaliacao_id: null,
    };
  }

  const a = assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa);

  if (a === 'fora_plantao') {
    return {
      estado: 'aguardando_outro_lider',
      motivo: 'Aguardando avaliação do líder do seu plantão.',
      elegivel: false,
      avaliacao_id: row.id,
    };
  }

  if (a === 'ferias') {
    return {
      estado: 'ferias',
      motivo: 'Férias nesta semana — sem Grãos.',
      elegivel: false,
      avaliacao_id: row.id,
    };
  }

  if (a === 'falta_injustificada') {
    return {
      estado: 'inelegivel',
      motivo: 'Falta injustificada — sem Grãos e nota da semana zerada.',
      elegivel: false,
      avaliacao_id: row.id,
    };
  }

  if (a === 'falta_justificada') {
    return {
      estado: 'inelegivel',
      motivo: 'Falta justificada nesta semana — sem Grãos. A nota do líder vale para desempenho.',
      elegivel: false,
      avaliacao_id: row.id,
    };
  }

  if (a === 'presente') {
    const bloqueio = criteriosBloqueiam(a, row);
    if (bloqueio) {
      return {
        estado: 'inelegivel',
        motivo: `${bloqueio} Sem Grãos esta semana. Seu saldo acumulado continua.`,
        elegivel: false,
        avaliacao_id: row.id,
      };
    }
    return {
      estado: 'elegivel',
      motivo: null,
      elegivel: true,
      avaliacao_id: row.id,
    };
  }

  return {
    estado: 'aguardando_lider',
    motivo: 'Aguardando avaliação da equipe.',
    elegivel: false,
    avaliacao_id: row.id,
  };
}

/** Avaliação mais recente do colaborador na semana (qualquer avaliador). */
export async function buscarAvaliacaoSemanaColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<AvaliacaoRow | null> {
  const { data, error } = await supabase
    .from('avaliacoes_diarias')
    .select(
      'id, assiduidade, justificativa_nota_baixa, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, updated_at'
    )
    .eq('colaborador_id', colaboradorId)
    .eq('data_referencia', semanaInicio)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) return null;
  return row as AvaliacaoRow;
}

export async function calcularElegibilidadeSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<GraosElegibilidadeSemana> {
  const row = await buscarAvaliacaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
  return avaliarElegibilidadeDeLinha(row);
}
