import { createAdminClient } from '@/lib/supabase/admin';
import { calcularPendenciasSemana } from '@/lib/avaliacao-pendentes-semana';
import { montarPayloadEvolucaoRede, payloadSomenteResumo } from '@/lib/evolucao-rede';
import { montarResumoILIRapido } from '@/lib/evolucao-lideranca';

const TTL_REDE_MS = 90_000;
const TTL_PENDENCIAS_MS = 60_000;

type EntradaCache = { expira: number; valor: unknown };

const cacheMemoria = new Map<string, EntradaCache>();

function lerCache<T>(chave: string): T | null {
  const hit = cacheMemoria.get(chave);
  if (!hit || Date.now() > hit.expira) {
    if (hit) cacheMemoria.delete(chave);
    return null;
  }
  return hit.valor as T;
}

function gravarCache(chave: string, valor: unknown, ttlMs: number): void {
  cacheMemoria.set(chave, { expira: Date.now() + ttlMs, valor });
}

/** Resumo de saúde da rede (dashboard / evolução ?resumo=1). */
export async function obterEvolucaoRedeResumoCacheado() {
  const chave = 'evolucao-rede-resumo';
  const hit = lerCache<Awaited<ReturnType<typeof payloadSomenteResumo>>>(chave);
  if (hit) return hit;

  const supabase = createAdminClient();
  const payload = await montarPayloadEvolucaoRede(supabase, { incluir_criterios: false });
  const resumo = payloadSomenteResumo(payload);
  gravarCache(chave, resumo, TTL_REDE_MS);
  return resumo;
}

/** ILI rápido da semana (dashboard). */
export async function obterIliRapidoCacheado() {
  const chave = 'ili-rapido';
  const hit = lerCache<Awaited<ReturnType<typeof montarResumoILIRapido>>>(chave);
  if (hit) return hit;

  const supabase = createAdminClient();
  const resumo = await montarResumoILIRapido(supabase);
  gravarCache(chave, resumo, TTL_REDE_MS);
  return resumo;
}

/** Pendências da semana na rede (sócios/admin). */
export async function obterPendenciasSemanaRedeCacheadas(rhAvaliadorId?: string) {
  const chaveAvaliador = rhAvaliadorId?.trim() || 'sem-avaliador';
  const chave = `pendencias-semana-rede:${chaveAvaliador}`;
  const hit = lerCache<Awaited<ReturnType<typeof calcularPendenciasSemana>>>(chave);
  if (hit) return hit;

  const supabase = createAdminClient();
  const resultado = await calcularPendenciasSemana(supabase, {
    filtro: 'pendentes',
    rhAvaliadorId: rhAvaliadorId || undefined,
  });
  gravarCache(chave, resultado, TTL_PENDENCIAS_MS);
  return resultado;
}
