import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularElegibilidadeSemana } from '@/lib/graos/elegibilidade';
import type { GraosMissaoId } from '@/lib/graos/constants';
import { GRAOS_PRIMEIRA_SEMANA_INICIO } from '@/lib/graos/constants';
import { semanaVigenteParaGraos } from '@/lib/graos/semana-vigencia';

export type GraosEstadoMovimento = 'pendente' | 'confirmado' | 'cancelado';

/** Missões que não entram na elegibilidade semanal (débitos/ajustes). */
const MISSOES_FORA_ELEGIBILIDADE = new Set(['debito_resgate', 'ajuste_rh']);

export type GraosSaldo = {
  confirmado: number;
  pendente: number;
  total_ganho_confirmado: number;
};

function tabelaAusente(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('graos_movimentos') && (m.includes('does not exist') || m.includes('schema cache'));
}

export function refKeyGraos(
  colaboradorId: string,
  missao: GraosMissaoId | string,
  semanaInicio: string,
  sufixo?: string
): string {
  const base = `${colaboradorId}:${missao}:${semanaInicio}`;
  return sufixo ? `${base}:${sufixo}` : base;
}

export async function calcularSaldoGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  opts?: { semanaInicio?: string | null }
): Promise<GraosSaldo> {
  let query = supabase
    .from('graos_movimentos')
    .select('graos, estado, missao, semana_inicio')
    .eq('colaborador_id', colaboradorId);

  if (opts?.semanaInicio) {
    query = query.eq('semana_inicio', opts.semanaInicio);
  }

  const { data, error } = await query;

  if (error) {
    if (tabelaAusente(error.message)) return { confirmado: 0, pendente: 0, total_ganho_confirmado: 0 };
    throw new Error(error.message);
  }

  let confirmado = 0;
  let pendente = 0;
  let total_ganho_confirmado = 0;

  for (const row of data ?? []) {
    const sem = row.semana_inicio ? String(row.semana_inicio) : null;
    if (sem && !semanaVigenteParaGraos(sem)) continue;

    const g = Number(row.graos) || 0;
    const est = String(row.estado) as GraosEstadoMovimento;
    const missao = String(row.missao ?? '');
    if (est === 'confirmado') {
      confirmado += g;
      if (g > 0 && missao !== 'debito_resgate' && missao !== 'ajuste_rh') {
        total_ganho_confirmado += g;
      }
    } else if (est === 'pendente' && g > 0) {
      pendente += g;
    }
  }

  // Saldo nunca negativo: não existe banco de dívidas. Resgate não pode deixar débito.
  return { confirmado: Math.max(0, confirmado), pendente, total_ganho_confirmado };
}

/**
 * Cancela créditos pendentes de semanas já encerradas (segunda anterior à semana corrente).
 * Evita acúmulo de «+5 pendente» de backfill ou semanas sem avaliação do líder.
 */
export async function encerrarPendentesSemanasPassadas(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaCorrenteInicio: string
): Promise<number> {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id')
    .eq('colaborador_id', colaboradorId)
    .eq('estado', 'pendente')
    .gt('graos', 0)
    .gte('semana_inicio', GRAOS_PRIMEIRA_SEMANA_INICIO)
    .lt('semana_inicio', semanaCorrenteInicio);

  if (error) {
    if (tabelaAusente(error.message)) return 0;
    throw new Error(error.message);
  }

  const ids = (data ?? []).map((r) => r.id);
  if (ids.length === 0) return 0;

  const { error: updErr } = await supabase
    .from('graos_movimentos')
    .update({
      estado: 'cancelado',
      meta: { ajuste_sistema: 'encerramento_pendente_semana_anterior', oculto_colaborador: true },
    })
    .in('id', ids);

  if (updErr) throw new Error(updErr.message);
  return ids.length;
}

/** Remove duplicatas históricas de login/backfill na mesma semana (mantém o mais antigo). */
export async function deduplicarLoginSemanaColaborador(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id, missao, semana_inicio, ref_key, created_at, estado')
    .eq('colaborador_id', colaboradorId)
    .eq('missao', 'login_semana')
    .order('created_at', { ascending: true });

  if (error) {
    if (tabelaAusente(error.message)) return 0;
    throw new Error(error.message);
  }

  const porSemana = new Map<string, typeof data>();
  for (const row of data ?? []) {
    const sem = String(row.semana_inicio ?? '');
    if (!sem || !semanaVigenteParaGraos(sem)) continue;
    const lista = porSemana.get(sem) ?? [];
    lista.push(row);
    porSemana.set(sem, lista);
  }

  const cancelarIds: string[] = [];
  for (const rows of Array.from(porSemana.values())) {
    if (rows.length <= 1) continue;
    const manter = rows.find((r) => r.estado === 'confirmado') ?? rows[0];
    for (const r of rows) {
      if (r.id !== manter.id) cancelarIds.push(r.id);
    }
  }

  if (cancelarIds.length === 0) return 0;

  const { error: updErr } = await supabase
    .from('graos_movimentos')
    .update({
      estado: 'cancelado',
      meta: { ajuste_sistema: 'deduplicacao_login_semana', oculto_colaborador: true },
    })
    .in('id', cancelarIds);

  if (updErr) throw new Error(updErr.message);
  return cancelarIds.length;
}

/** Um único crédito de envio de sugestão por semana (1 Grão). */
export async function deduplicarEnvioSugestaoSemanaColaborador(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<number> {
  const canonRef = refKeyGraos(colaboradorId, 'sugestao_semana', semanaInicio);
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id, ref_key, estado, graos, created_at')
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio)
    .eq('missao', 'sugestao_semana')
    .neq('estado', 'cancelado');

  if (error) {
    if (tabelaAusente(error.message)) return 0;
    throw new Error(error.message);
  }

  const rows = data ?? [];
  if (rows.length === 0) return 0;

  const rank = (est: string) => (est === 'confirmado' ? 2 : est === 'pendente' ? 1 : 0);
  const sorted = [...rows].sort((a, b) => {
    const dr = rank(String(b.estado)) - rank(String(a.estado));
    if (dr !== 0) return dr;
    if (a.ref_key === canonRef && b.ref_key !== canonRef) return -1;
    if (b.ref_key === canonRef && a.ref_key !== canonRef) return 1;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  const manter = sorted[0];
  const cancelarIds: string[] = sorted.slice(1).map((r) => r.id);

  if (cancelarIds.length > 0) {
    const { error: updErr } = await supabase
      .from('graos_movimentos')
      .update({
        estado: 'cancelado',
        meta: { ajuste_sistema: 'deduplicacao_envio_sugestao', oculto_colaborador: true },
      })
      .in('id', cancelarIds);
    if (updErr) throw new Error(updErr.message);
  }

  if (Number(manter.graos) !== 1 || manter.ref_key !== canonRef) {
    await supabase
      .from('graos_movimentos')
      .update({ graos: 1, descricao: 'Enviar sugestão', ref_key: canonRef })
      .eq('id', manter.id);
  }

  return cancelarIds.length;
}

/** Credita missão (pendente). Idempotente via ref_key. */
export async function creditarMissaoGraos(
  supabase: SupabaseClient,
  opts: {
    colaboradorId: string;
    semanaInicio: string;
    missao: GraosMissaoId | string;
    graos: number;
    refKey: string;
    descricao: string;
    meta?: Record<string, unknown>;
    /** Se true, reabre crédito cancelado da mesma ref_key (ex.: nova avaliação elegível). */
    reabrirSeCancelado?: boolean;
  }
): Promise<{ ok: true; criado: boolean; estado: GraosEstadoMovimento } | { ok: false; erro: string }> {
  if (!semanaVigenteParaGraos(opts.semanaInicio)) {
    return { ok: true, criado: false, estado: 'cancelado' };
  }
  if (opts.graos <= 0) return { ok: false, erro: 'Grãos inválidos' };

  const { data: existente } = await supabase
    .from('graos_movimentos')
    .select('id, estado, graos, meta')
    .eq('ref_key', opts.refKey)
    .maybeSingle();

  if (existente) {
    const est = existente.estado as GraosEstadoMovimento;
    const meta = (existente.meta as Record<string, unknown> | null) ?? {};
    const graosAtual = Number(existente.graos) || 0;
    if (opts.missao === 'sugestao_semana' && graosAtual !== opts.graos) {
      await supabase
        .from('graos_movimentos')
        .update({ graos: opts.graos, descricao: opts.descricao })
        .eq('id', existente.id);
    }
    const reabrirAjusteInterno =
      meta.oculto_colaborador === true || typeof meta.ajuste_sistema === 'string';
    if (est === 'cancelado' && (opts.reabrirSeCancelado || reabrirAjusteInterno)) {
      await supabase
        .from('graos_movimentos')
        .update({ estado: 'pendente', graos: opts.graos, descricao: opts.descricao, meta: opts.meta ?? {} })
        .eq('id', existente.id);
      return { ok: true, criado: false, estado: 'pendente' };
    }
    return { ok: true, criado: false, estado: est };
  }

  const { error } = await supabase.from('graos_movimentos').insert({
    colaborador_id: opts.colaboradorId,
    semana_inicio: opts.semanaInicio,
    missao: opts.missao,
    graos: opts.graos,
    estado: 'pendente',
    ref_key: opts.refKey,
    descricao: opts.descricao,
    meta: opts.meta ?? {},
  });

  if (error) {
    if (error.code === '23505') return { ok: true, criado: false, estado: 'pendente' };
    if (tabelaAusente(error.message)) return { ok: false, erro: 'Sistema de Grãos não instalado (migração 044).' };
    return { ok: false, erro: error.message };
  }

  return { ok: true, criado: true, estado: 'pendente' };
}

async function listarMovimentosMissaoSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string,
  estados: GraosEstadoMovimento[]
) {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id, ref_key, estado, missao')
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio)
    .in('estado', estados)
    .gt('graos', 0);

  if (error) {
    if (tabelaAusente(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).filter((m) => !MISSOES_FORA_ELEGIBILIDADE.has(String(m.missao ?? '')));
}

/** Confirma pendentes (e reabre cancelados) da semana ou cancela se inelegível. */
export async function processarElegibilidadeSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<void> {
  if (!semanaVigenteParaGraos(semanaInicio)) return;

  const eleg = await calcularElegibilidadeSemana(supabase, colaboradorId, semanaInicio);

  const movimentos = await listarMovimentosMissaoSemana(supabase, colaboradorId, semanaInicio, [
    'pendente',
    'cancelado',
  ]);

  if (!movimentos.length) return;

  if (!eleg.elegivel) {
    if (eleg.estado === 'aguardando_lider' || eleg.estado === 'aguardando_outro_lider') {
      return;
    }
    for (const p of movimentos.filter((m) => m.estado === 'pendente')) {
      await supabase.from('graos_movimentos').update({ estado: 'cancelado' }).eq('id', p.id);
    }
    return;
  }

  for (const p of movimentos) {
    await supabase.from('graos_movimentos').update({ estado: 'confirmado' }).eq('id', p.id);
  }
}

/** Reprocessa elegibilidade em semanas com créditos pendentes ou cancelados (missões). */
export async function processarElegibilidadeTodasSemanasPendentesGraos(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('semana_inicio, missao, estado')
    .eq('colaborador_id', colaboradorId)
    .in('estado', ['pendente', 'cancelado'])
    .gt('graos', 0);

  if (error) {
    if (tabelaAusente(error.message)) return;
    throw new Error(error.message);
  }

  const semanas = Array.from(
    new Set(
      (data ?? [])
        .filter((r) => !MISSOES_FORA_ELEGIBILIDADE.has(String(r.missao ?? '')))
        .filter((r) => semanaVigenteParaGraos(r.semana_inicio ? String(r.semana_inicio) : null))
        .map((r) => (r.semana_inicio ? String(r.semana_inicio) : ''))
        .filter(Boolean)
    )
  );

  for (const sem of semanas) {
    await processarElegibilidadeSemanaGraos(supabase, colaboradorId, sem);
  }
}

/** Débito irreversível de resgate. */
export async function debitarResgateGraos(
  supabase: SupabaseClient,
  opts: {
    colaboradorId: string;
    totalGraos: number;
    refKey: string;
    resgateId: string;
  }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const saldo = await calcularSaldoGraos(supabase, opts.colaboradorId);
  if (saldo.confirmado < opts.totalGraos) {
    return { ok: false, erro: 'Saldo confirmado insuficiente.' };
  }

  const { error } = await supabase.from('graos_movimentos').insert({
    colaborador_id: opts.colaboradorId,
    semana_inicio: null,
    missao: 'debito_resgate',
    graos: -opts.totalGraos,
    estado: 'confirmado',
    ref_key: opts.refKey,
    descricao: 'Resgate na cafeteria',
    meta: { resgate_id: opts.resgateId },
  });

  if (error) {
    if (error.code === '23505') return { ok: true };
    return { ok: false, erro: error.message };
  }

  return { ok: true };
}

export async function listarExtratoGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  limite = 20,
  opts?: { ocultarCancelados?: boolean }
) {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id, missao, graos, estado, descricao, created_at, semana_inicio')
    .eq('colaborador_id', colaboradorId)
    .order('created_at', { ascending: false })
    .limit(opts?.ocultarCancelados ? limite * 3 : limite);

  if (error) {
    if (tabelaAusente(error.message)) return [];
    throw new Error(error.message);
  }

  let rows = data ?? [];
  if (opts?.ocultarCancelados) {
    rows = rows.filter((r) => String(r.estado) !== 'cancelado');
  }
  rows = rows.filter((r) => {
    const sem = r.semana_inicio ? String(r.semana_inicio) : null;
    return sem ? semanaVigenteParaGraos(sem) : true;
  });
  return rows.slice(0, limite);
}
