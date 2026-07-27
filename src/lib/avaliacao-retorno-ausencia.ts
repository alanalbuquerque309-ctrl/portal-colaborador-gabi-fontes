import type { SupabaseClient } from '@supabase/supabase-js';
import {
  formatarDataLocalISO,
  inicioSemanaSegundaFeiraLocal,
  parseDataLocalISO,
} from '@/lib/semana-referencia';
import {
  ehFeriasAvaliacao,
  ehLicencaOuAfastamentoAvaliacao,
  isDateIsoAvaliacao,
} from '@/lib/avaliacao-semanal-shared';

/**
 * Primeira segunda-feira em que a pessoa volta a aparecer na avaliação:
 * a semana seguinte à semana que contém a data de retorno.
 */
export function primeiraSemanaAvaliavelAposRetorno(dataRetornoIso: string): string {
  const segDaSemanaDoRetorno = inicioSemanaSegundaFeiraLocal(dataRetornoIso);
  const d = parseDataLocalISO(segDaSemanaDoRetorno);
  if (Number.isNaN(d.getTime())) return segDaSemanaDoRetorno;
  d.setDate(d.getDate() + 7);
  return formatarDataLocalISO(d);
}

/** Ainda está ausente na semana cobrada (não deve aparecer na lista). */
export function ausenciaVigenteNaSemanaCobrada(
  dataRetornoIso: string | null | undefined,
  semanaCobradaIso: string
): boolean {
  if (!dataRetornoIso || !isDateIsoAvaliacao(dataRetornoIso)) return false;
  if (!isDateIsoAvaliacao(semanaCobradaIso)) return false;
  const liberacao = primeiraSemanaAvaliavelAposRetorno(dataRetornoIso);
  return inicioSemanaSegundaFeiraLocal(semanaCobradaIso) < liberacao;
}

export function validarDataRetornoAusencia(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!isDateIsoAvaliacao(s)) return null;
  return s;
}

/**
 * IDs com férias/licença e data de retorno ainda vigente para a semana cobrada.
 * Usa o retorno mais recente por colaborador.
 */
export async function idsColaboradoresAusentesPorRetorno(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaCobradaIso: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const semana = inicioSemanaSegundaFeiraLocal(semanaCobradaIso);
  const prim = await supabase
    .from('avaliacoes_diarias')
    .select('colaborador_id, assiduidade, justificativa_nota_baixa, data_retorno_previsto, ignorada')
    .in('colaborador_id', colaboradorIds)
    .not('data_retorno_previsto', 'is', null);

  if (prim.error) {
    if (/data_retorno_previsto|schema cache|does not exist/i.test(prim.error.message)) {
      return out;
    }
    throw new Error(prim.error.message);
  }

  const melhorRetorno = new Map<string, string>();
  for (const raw of prim.data ?? []) {
    if ((raw as { ignorada?: boolean | null }).ignorada === true) continue;
    const cid = String(raw.colaborador_id);
    const retorno = String((raw as { data_retorno_previsto?: string | null }).data_retorno_previsto ?? '').slice(
      0,
      10
    );
    if (!isDateIsoAvaliacao(retorno)) continue;
    const assid = (raw as { assiduidade?: string | null }).assiduidade;
    const just = (raw as { justificativa_nota_baixa?: string | null }).justificativa_nota_baixa;
    if (!ehFeriasAvaliacao(assid, just) && !ehLicencaOuAfastamentoAvaliacao(assid, just)) continue;
    const atual = melhorRetorno.get(cid);
    if (!atual || retorno > atual) melhorRetorno.set(cid, retorno);
  }

  for (const [cid, retorno] of Array.from(melhorRetorno.entries())) {
    if (ausenciaVigenteNaSemanaCobrada(retorno, semana)) out.add(cid);
  }
  return out;
}
