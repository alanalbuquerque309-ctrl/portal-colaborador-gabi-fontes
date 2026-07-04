import { createAdminClient } from '@/lib/supabase/admin';
import { calcularPendenciasSemana } from '@/lib/avaliacao-pendentes-semana';
import { montarPayloadEvolucaoRede, payloadSomenteResumo } from '@/lib/evolucao-rede';
import { montarResumoILIRapido } from '@/lib/evolucao-lideranca';

/**
 * Cache de warm invocation (module-level Map).
 * Em Vercel serverless, sobrevive entre requests no mesmo container,
 * mas é perdido em cold starts. TTL de 120s limita dados obsoletos.
 */
const CACHE_TTL_MS = 120_000;

type Slot<T> = { expira: number; valor: T };
let slotResumoRede: Slot<Awaited<ReturnType<typeof payloadSomenteResumo>>> | null = null;
let slotIliRapido: Slot<Awaited<ReturnType<typeof montarResumoILIRapido>>> | null = null;
const slotsPendencias = new Map<string, Slot<Awaited<ReturnType<typeof calcularPendenciasSemana>>>>();

function valido<T>(slot: Slot<T> | null | undefined): slot is Slot<T> {
  return slot != null && Date.now() < slot.expira;
}

export async function obterEvolucaoRedeResumoCacheado() {
  if (valido(slotResumoRede)) return slotResumoRede.valor;
  const supabase = createAdminClient();
  const payload = await montarPayloadEvolucaoRede(supabase, { incluir_criterios: false });
  const resumo = payloadSomenteResumo(payload);
  slotResumoRede = { expira: Date.now() + CACHE_TTL_MS, valor: resumo };
  return resumo;
}

export async function obterIliRapidoCacheado() {
  if (valido(slotIliRapido)) return slotIliRapido.valor;
  const supabase = createAdminClient();
  const resumo = await montarResumoILIRapido(supabase);
  slotIliRapido = { expira: Date.now() + CACHE_TTL_MS, valor: resumo };
  return resumo;
}

export async function obterPendenciasSemanaRedeCacheadas(rhAvaliadorId?: string) {
  const chave = rhAvaliadorId?.trim() || '_';
  const slot = slotsPendencias.get(chave);
  if (valido(slot)) return slot.valor;
  const supabase = createAdminClient();
  const resultado = await calcularPendenciasSemana(supabase, {
    filtro: 'pendentes',
    rhAvaliadorId: rhAvaliadorId || undefined,
  });
  slotsPendencias.set(chave, { expira: Date.now() + CACHE_TTL_MS, valor: resultado });
  return resultado;
}
