import { createAdminClient } from '@/lib/supabase/admin';
import { calcularRankingLiderInspirador } from '@/lib/lider-inspirador';
import {
  calcularTop3GeralRede,
  calcularTop3GeralSemana,
  calcularTop3PorUnidadeRede,
  calcularTop3PorUnidadeSemana,
  mesAtualUTC,
  anoAtualUTC,
  calcularTop3GeralAnual,
  calcularTop3PorUnidadeAnual,
} from '@/lib/mural-ranking-unidade';
import {
  calcularRankingTrofeusMesCompleto,
  calcularRankingTrofeusSemanaCompleto,
  calcularRankingTrofeusAnoCompleto,
} from '@/lib/mural-ranking-trofeus-pares';
import { segundaSemanaSaoPaulo, semanaAnteriorSaoPaulo, rotuloSemanaSaoPaulo } from '@/lib/semana-brasil';

const CACHE_TTL_MS = 120_000;

type Slot<T> = { expira: number; valor: T };

let slotSemanal: Slot<Awaited<ReturnType<typeof montarReconhecimentoSemanal>>> | null = null;
let slotMensal: Slot<Awaited<ReturnType<typeof montarReconhecimentoMensal>>> | null = null;
let slotAnual: Slot<Awaited<ReturnType<typeof montarReconhecimentoAnual>>> | null = null;
let slotLiderSemanal: Slot<Awaited<ReturnType<typeof calcularRankingLiderInspirador>>> | null = null;

function valido<T>(slot: Slot<T> | null | undefined): slot is Slot<T> {
  return slot != null && Date.now() < slot.expira;
}

async function montarReconhecimentoSemanal() {
  const supabase = createAdminClient();
  const semanaAvaliacao = semanaAnteriorSaoPaulo();
  const semanaTrofeus = segundaSemanaSaoPaulo();

  const [geral, porUnidade, trofeus] = await Promise.all([
    calcularTop3GeralSemana(supabase, semanaAvaliacao),
    calcularTop3PorUnidadeSemana(supabase, semanaAvaliacao),
    calcularRankingTrofeusSemanaCompleto(supabase, semanaTrofeus).catch(() => ({
      semana_inicio: semanaTrofeus,
      ranking: [],
    })),
  ]);

  return {
    ok: true as const,
    semana_inicio: semanaAvaliacao,
    semana_trofeus_inicio: semanaTrofeus,
    semana_rotulo: rotuloSemanaSaoPaulo(semanaAvaliacao),
    semana_rotulo_trofeus: rotuloSemanaSaoPaulo(semanaTrofeus),
    ranking_geral_top3: geral.top,
    ranking_por_unidade: porUnidade.unidades,
    ranking_trofeus: trofeus.ranking,
  };
}

async function montarReconhecimentoMensal() {
  const supabase = createAdminClient();
  const atual = mesAtualUTC();

  const [geral, porUnidade, trofeus] = await Promise.all([
    calcularTop3GeralRede(supabase, { ano: atual.ano, mes: atual.mes }),
    calcularTop3PorUnidadeRede(supabase, { ano: atual.ano, mes: atual.mes }),
    calcularRankingTrofeusMesCompleto(supabase, { ano: atual.ano, mes: atual.mes }).catch(() => ({
      mes_referencia: atual.mesRef,
      ranking: [],
    })),
  ]);

  return {
    ok: true as const,
    mes_referencia: atual.mesRef,
    ranking_geral_top3: geral.top,
    ranking_por_unidade: porUnidade.unidades,
    ranking_trofeus: trofeus.ranking,
  };
}

async function montarReconhecimentoAnual() {
  const supabase = createAdminClient();
  const atual = anoAtualUTC();

  const [geral, porUnidade, trofeus] = await Promise.all([
    calcularTop3GeralAnual(supabase, { ano: atual.ano }),
    calcularTop3PorUnidadeAnual(supabase, { ano: atual.ano }),
    calcularRankingTrofeusAnoCompleto(supabase, { ano: atual.ano }).catch(() => ({
      ano_referencia: atual.anoRef,
      ranking: [],
    })),
  ]);

  return {
    ok: true as const,
    ano_referencia: atual.anoRef,
    ranking_geral_top3: geral.top,
    ranking_por_unidade: porUnidade.unidades,
    ranking_trofeus: trofeus.ranking,
  };
}

export async function obterReconhecimentoSemanalCacheado() {
  if (valido(slotSemanal)) return slotSemanal.valor;
  const valor = await montarReconhecimentoSemanal();
  slotSemanal = { expira: Date.now() + CACHE_TTL_MS, valor };
  return valor;
}

export async function obterReconhecimentoMensalCacheado() {
  if (valido(slotMensal)) return slotMensal.valor;
  const valor = await montarReconhecimentoMensal();
  slotMensal = { expira: Date.now() + CACHE_TTL_MS, valor };
  return valor;
}

export async function obterReconhecimentoAnualCacheado() {
  if (valido(slotAnual)) return slotAnual.valor;
  const valor = await montarReconhecimentoAnual();
  slotAnual = { expira: Date.now() + CACHE_TTL_MS, valor };
  return valor;
}

export async function obterLiderInspiradorCacheado() {
  if (valido(slotLiderSemanal)) return slotLiderSemanal.valor;
  const supabase = createAdminClient();
  const valor = await calcularRankingLiderInspirador(supabase);
  slotLiderSemanal = { expira: Date.now() + CACHE_TTL_MS, valor };
  return valor;
}
