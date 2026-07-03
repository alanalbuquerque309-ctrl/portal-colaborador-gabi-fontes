import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularPendenciasSemana } from '@/lib/avaliacao-pendentes-semana';
import { montarPayloadEvolucaoRede, payloadSomenteResumo } from '@/lib/evolucao-rede';
import { montarResumoILIRapido } from '@/lib/evolucao-lideranca';

const TTL_REDE_SEG = 90;
const TTL_PENDENCIAS_SEG = 60;

/** Resumo de saúde da rede (dashboard / evolução ?resumo=1). */
export function obterEvolucaoRedeResumoCacheado() {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const payload = await montarPayloadEvolucaoRede(supabase, { incluir_criterios: false });
      return payloadSomenteResumo(payload);
    },
    ['portal-evolucao-rede-resumo'],
    { revalidate: TTL_REDE_SEG, tags: ['evolucao-rede'] }
  )();
}

/** ILI rápido da semana (dashboard). */
export function obterIliRapidoCacheado() {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      return montarResumoILIRapido(supabase);
    },
    ['portal-ili-rapido'],
    { revalidate: TTL_REDE_SEG, tags: ['ili-lideranca'] }
  )();
}

/** Pendências da semana na rede (sócios/admin). */
export function obterPendenciasSemanaRedeCacheadas(rhAvaliadorId?: string) {
  const chaveAvaliador = rhAvaliadorId?.trim() || 'sem-avaliador';
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      return calcularPendenciasSemana(supabase, {
        filtro: 'pendentes',
        rhAvaliadorId: rhAvaliadorId || undefined,
      });
    },
    ['portal-pendencias-semana-rede', chaveAvaliador],
    { revalidate: TTL_PENDENCIAS_SEG, tags: ['pendencias-semana'] }
  )();
}
