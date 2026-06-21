import type { SupabaseClient } from '@supabase/supabase-js';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import { buscarAvaliacaoSemanaColaborador } from '@/lib/graos/elegibilidade';
import { segundaFeiraAnteriorIso } from '@/lib/semana-referencia';

export const MOTIVO_BLOQUEIO_LIDERANCA_FERIAS =
  'Você está registrado(a) de férias nesta semana — avaliação de liderança não se aplica.';

type LinhaAssid = {
  assiduidade?: string | null;
  justificativa_nota_baixa?: string | null;
  ignorada?: boolean | null;
};

export function linhaIndicaFeriasSemana(row: LinhaAssid | null | undefined): boolean {
  if (!row) return false;
  if (row.ignorada === true) return false;
  return assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa) === 'ferias';
}

/** Qualquer linha da semana (qualquer avaliador) com assiduidade férias. */
export function colaboradorDeFeriasNasLinhas(rows: LinhaAssid[]): boolean {
  return rows.some((r) => linhaIndicaFeriasSemana(r));
}

/** Há avaliação não ignorada que não seja férias/fora do plantão (ex.: retorno). */
export function colaboradorComAvaliacaoAtivaSemana(rows: LinhaAssid[]): boolean {
  return rows.some((r) => {
    if (r.ignorada === true) return false;
    const a = assiduidadeDoBanco(r.assiduidade, r.justificativa_nota_baixa);
    return a !== 'ferias' && a !== 'fora_plantao';
  });
}

async function carregarLinhasAssidPorSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanas: string[]
): Promise<Map<string, Map<string, LinhaAssid[]>>> {
  const porColab = new Map<string, Map<string, LinhaAssid[]>>();
  if (colaboradorIds.length === 0 || semanas.length === 0) return porColab;

  let rows: Record<string, unknown>[] = [];
  const prim = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, data_referencia, assiduidade, justificativa_nota_baixa, ignorada')
    .in('data_referencia', semanas)
    .in('colaborador_id', colaboradorIds);

  if (prim.error && /ignorada/i.test(prim.error.message)) {
    const retry = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, data_referencia, assiduidade, justificativa_nota_baixa')
      .in('data_referencia', semanas)
      .in('colaborador_id', colaboradorIds);
    if (retry.error) throw new Error(retry.error.message);
    rows = (retry.data ?? []) as Record<string, unknown>[];
  } else {
    if (prim.error) throw new Error(prim.error.message);
    rows = (prim.data ?? []) as Record<string, unknown>[];
  }

  for (const raw of rows) {
    const cid = String(raw.colaborador_id);
    const sem = String(raw.data_referencia ?? '');
    const linha: LinhaAssid = {
      assiduidade: raw.assiduidade as string | null,
      justificativa_nota_baixa: raw.justificativa_nota_baixa as string | null,
      ignorada: raw.ignorada as boolean | null,
    };
    const porSem = porColab.get(cid) ?? new Map<string, LinhaAssid[]>();
    const list = porSem.get(sem) ?? [];
    list.push(linha);
    porSem.set(sem, list);
    porColab.set(cid, porSem);
  }
  return porColab;
}

/** Colaboradores com férias registradas na semana — leitura em lote. */
export async function idsColaboradoresDeFeriasNaSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const porColab = await carregarLinhasAssidPorSemana(supabase, colaboradorIds, [semanaInicio]);
  const out = new Set<string>();
  for (const id of colaboradorIds) {
    const linhas = porColab.get(id)?.get(semanaInicio) ?? [];
    if (colaboradorDeFeriasNasLinhas(linhas)) out.add(id);
  }
  return out;
}

/**
 * Café Conecta: férias na semana do sorteio ou continuidade da semana passada
 * (registro típico em «Pendentes»), salvo se já houver avaliação de retorno na semana atual.
 */
export async function idsColaboradoresDeFeriasParaCafeConecta(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicioAtual: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const semanaAnterior = segundaFeiraAnteriorIso(semanaInicioAtual);
  const semanas =
    semanaAnterior === semanaInicioAtual ? [semanaInicioAtual] : [semanaInicioAtual, semanaAnterior];
  const porColab = await carregarLinhasAssidPorSemana(supabase, colaboradorIds, semanas);

  for (const id of colaboradorIds) {
    const porSem = porColab.get(id) ?? new Map<string, LinhaAssid[]>();
    const linhasAtual = porSem.get(semanaInicioAtual) ?? [];
    if (colaboradorDeFeriasNasLinhas(linhasAtual)) {
      out.add(id);
      continue;
    }
    const linhasAnterior = porSem.get(semanaAnterior) ?? [];
    if (colaboradorDeFeriasNasLinhas(linhasAnterior) && !colaboradorComAvaliacaoAtivaSemana(linhasAtual)) {
      out.add(id);
    }
  }
  return out;
}

/** Há avaliação de equipe/RH com assiduidade «férias» na segunda `semanaInicio`. */
export async function colaboradorDeFeriasNaSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const row = await buscarAvaliacaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
  if (!row) return false;
  return assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa) === 'ferias';
}

/** Cancela crédito de «Avaliar liderança» e reprocessa Grãos da semana. */
export async function aplicarEfeitosFeriasSemanaColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<void> {
  const ferias = await colaboradorDeFeriasNaSemana(supabase, colaboradorId, semanaInicio);
  if (!ferias) return;

  await supabase
    .from('graos_movimentos')
    .update({
      estado: 'cancelado',
      meta: { ajuste_sistema: 'ferias_sem_lideranca', oculto_colaborador: true },
    })
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio)
    .eq('missao', 'lideranca_semana')
    .neq('estado', 'cancelado');

  const { reprocessarGraosAposAvaliacaoEquipe } = await import('@/lib/graos/sync-hook');
  await reprocessarGraosAposAvaliacaoEquipe(supabase, colaboradorId, semanaInicio);
}
