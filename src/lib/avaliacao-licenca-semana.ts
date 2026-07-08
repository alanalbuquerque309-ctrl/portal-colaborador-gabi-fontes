import type { SupabaseClient } from '@supabase/supabase-js';
import { ehLicencaOuAfastamentoAvaliacao } from '@/lib/avaliacao-semanal-shared';
import { buscarAvaliacaoSemanaColaborador } from '@/lib/graos/elegibilidade';

type LinhaAssid = {
  assiduidade?: string | null;
  justificativa_nota_baixa?: string | null;
  ignorada?: boolean | null;
};

export function linhaIndicaLicencaOuAfastamentoSemana(row: LinhaAssid | null | undefined): boolean {
  if (!row) return false;
  if (row.ignorada === true) return false;
  return ehLicencaOuAfastamentoAvaliacao(row.assiduidade, row.justificativa_nota_baixa);
}

/** Qualquer linha da semana (qualquer avaliador) com licença ou afastamento. */
export function colaboradorDeLicencaOuAfastamentoNasLinhas(rows: LinhaAssid[]): boolean {
  return rows.some((r) => linhaIndicaLicencaOuAfastamentoSemana(r));
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

export async function idsColaboradoresDeLicencaOuAfastamentoNaSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const porColab = await carregarLinhasAssidPorSemana(supabase, colaboradorIds, [semanaInicio]);
  const out = new Set<string>();
  for (const id of colaboradorIds) {
    const linhas = porColab.get(id)?.get(semanaInicio) ?? [];
    if (colaboradorDeLicencaOuAfastamentoNasLinhas(linhas)) out.add(id);
  }
  return out;
}

export async function colaboradorDeLicencaOuAfastamentoNaSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const row = await buscarAvaliacaoSemanaColaborador(supabase, colaboradorId, semanaInicio);
  if (!row) return false;
  return ehLicencaOuAfastamentoAvaliacao(row.assiduidade, row.justificativa_nota_baixa);
}
