import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularElegibilidadeSemana } from '@/lib/graos/elegibilidade';
import type { GraosMissaoId } from '@/lib/graos/constants';

export type GraosEstadoMovimento = 'pendente' | 'confirmado' | 'cancelado';

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
  colaboradorId: string
): Promise<GraosSaldo> {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('graos, estado, missao')
    .eq('colaborador_id', colaboradorId);

  if (error) {
    if (tabelaAusente(error.message)) return { confirmado: 0, pendente: 0, total_ganho_confirmado: 0 };
    throw new Error(error.message);
  }

  let confirmado = 0;
  let pendente = 0;
  let total_ganho_confirmado = 0;

  for (const row of data ?? []) {
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

  return { confirmado, pendente, total_ganho_confirmado };
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
  }
): Promise<{ ok: true; criado: boolean; estado: GraosEstadoMovimento } | { ok: false; erro: string }> {
  if (opts.graos <= 0) return { ok: false, erro: 'Grãos inválidos' };

  const { data: existente } = await supabase
    .from('graos_movimentos')
    .select('id, estado')
    .eq('ref_key', opts.refKey)
    .maybeSingle();

  if (existente) {
    return { ok: true, criado: false, estado: existente.estado as GraosEstadoMovimento };
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

/** Confirma pendentes da semana ou cancela se inelegível. */
export async function processarElegibilidadeSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<void> {
  const eleg = await calcularElegibilidadeSemana(supabase, colaboradorId, semanaInicio);

  const { data: pendentes, error } = await supabase
    .from('graos_movimentos')
    .select('id, ref_key')
    .eq('colaborador_id', colaboradorId)
    .eq('semana_inicio', semanaInicio)
    .eq('estado', 'pendente')
    .gt('graos', 0);

  if (error) {
    if (tabelaAusente(error.message)) return;
    throw new Error(error.message);
  }

  if (!pendentes?.length) return;

  const novoEstado: GraosEstadoMovimento = eleg.elegivel ? 'confirmado' : 'cancelado';

  for (const p of pendentes) {
    await supabase.from('graos_movimentos').update({ estado: novoEstado }).eq('id', p.id);
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
  limite = 20
) {
  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('id, missao, graos, estado, descricao, created_at, semana_inicio')
    .eq('colaborador_id', colaboradorId)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) {
    if (tabelaAusente(error.message)) return [];
    throw new Error(error.message);
  }

  return data ?? [];
}
