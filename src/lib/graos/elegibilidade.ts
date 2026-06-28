import type { SupabaseClient } from '@supabase/supabase-js';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import type { AssiduidadeTipo } from '@/lib/avaliacao-diaria';
import { semanasAvaliacaoOperacionalParaGraos } from '@/lib/avaliacao-semana-cobranca';

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
  /** Falta injustificada zera todo o saldo acumulado de Grãos. */
  falta_injustificada?: boolean;
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
      motivo: 'Aguardando avaliação da equipe (gerente ou RH). Você pode cobrar a avaliação.',
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
      motivo: 'Falta injustificada — perde todo o saldo de Grãos (fica zerado) e a nota da semana zera.',
      elegivel: false,
      avaliacao_id: row.id,
      falta_injustificada: true,
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

/** Preferir avaliação que fecha a semana (presente/falta) em vez de «fora do plantão». */
export function escolherAvaliacaoParaGraos(rows: AvaliacaoRow[]): AvaliacaoRow | null {
  const ativos = rows.filter((r) => !(r as { ignorada?: boolean }).ignorada);
  if (!ativos.length) return null;

  const comFechamento = ativos.filter((r) => {
    const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
    return a !== 'fora_plantao';
  });
  const pool = comFechamento.length > 0 ? comFechamento : ativos;

  pool.sort((a, b) => {
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });
  return pool[0] ?? null;
}

/** Avaliação que libera Grãos na semana civil (gerente ou Visita RH). */
export async function buscarAvaliacaoSemanaColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<AvaliacaoRow | null> {
  const semanasBusca = semanasAvaliacaoOperacionalParaGraos(semanaInicio);
  const selectComIgnorada =
    'id, assiduidade, justificativa_nota_baixa, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, updated_at, ignorada';
  const selectSemIgnorada =
    'id, assiduidade, justificativa_nota_baixa, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, nota_proatividade, updated_at';

  let rawRows: Record<string, unknown>[] = [];
  for (const sel of [selectComIgnorada, selectSemIgnorada]) {
    const res = await supabase
      .from('avaliacoes_diarias')
      .select(sel)
      .eq('colaborador_id', colaboradorId)
      .in('data_referencia', semanasBusca)
      .order('updated_at', { ascending: false });
    if (!res.error) {
      rawRows = (res.data ?? []) as unknown as Record<string, unknown>[];
      break;
    }
    if (!/ignorada/i.test(res.error.message)) {
      throw new Error(res.error.message);
    }
  }

  const row = escolherAvaliacaoParaGraos(rawRows as AvaliacaoRow[]);
  if (!row) return null;
  return row as AvaliacaoRow;
}

/** Gerente ou RH já registrou avaliação que conta para a semana (libera Grãos / tira pendência). */
export function colaboradorRecebeuAvaliacaoFechamentoSemana(rows: AvaliacaoRow[]): boolean {
  const row = escolherAvaliacaoParaGraos(rows);
  if (!row) return false;
  const e = avaliarElegibilidadeDeLinha(row);
  return e.estado !== 'aguardando_lider' && e.estado !== 'aguardando_outro_lider';
}

export async function calcularElegibilidadeSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<GraosElegibilidadeSemana> {
  const row = await buscarAvaliacaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
  return avaliarElegibilidadeDeLinha(row);
}

export type GraosResumoElegibilidadeUi = GraosElegibilidadeSemana & {
  /** Só exibir aviso «cobrar líder» quando há Grãos pendentes nesta semana. */
  mostrar_aviso_cobrar_lider: boolean;
};

export async function calcularElegibilidadeSemanaComUi(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string,
  saldoPendenteSemana: number
): Promise<GraosResumoElegibilidadeUi> {
  const eleg = await calcularElegibilidadeSemana(supabase, colaboradorId, semanaInicio);
  const mostrar_aviso_cobrar_lider =
    eleg.estado === 'aguardando_lider' && saldoPendenteSemana > 0;
  return { ...eleg, mostrar_aviso_cobrar_lider };
}
