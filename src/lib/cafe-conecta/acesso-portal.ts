import type { SupabaseClient } from '@supabase/supabase-js';
import { semanaInicioUtcIsoSp } from '@/lib/semana-brasil';

async function idsGraosLoginSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const { data, error } = await supabase
    .from('graos_movimentos')
    .select('colaborador_id')
    .in('colaborador_id', colaboradorIds)
    .eq('semana_inicio', semanaInicio)
    .eq('missao', 'login_semana')
    .in('estado', ['pendente', 'confirmado']);

  if (error) {
    if (/graos_movimentos/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return out;
    }
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    out.add(String(row.colaborador_id));
  }
  return out;
}

async function idsComPresencaPortalSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const desde = semanaInicioUtcIsoSp(semanaInicio);
  const { data, error } = await supabase
    .from('portal_presenca')
    .select('colaborador_id')
    .in('colaborador_id', colaboradorIds)
    .gte('ultimo_ping_at', desde);

  if (error) {
    if (/portal_presenca/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return out;
    }
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    out.add(String(row.colaborador_id));
  }
  return out;
}

async function idsComEmocionalSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const { data, error } = await supabase
    .from('emocional_registro')
    .select('colaborador_id')
    .in('colaborador_id', colaboradorIds)
    .gte('data', semanaInicio);

  if (error) {
    if (/emocional_registro/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return out;
    }
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    out.add(String(row.colaborador_id));
  }
  return out;
}

async function idsComAvisoVisualizadoSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const desde = semanaInicioUtcIsoSp(semanaInicio);
  const { data, error } = await supabase
    .from('aviso_visualizacoes')
    .select('colaborador_id')
    .in('colaborador_id', colaboradorIds)
    .gte('visualizado_em', desde);

  if (error) {
    if (/aviso_visualizacoes/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return out;
    }
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    out.add(String(row.colaborador_id));
  }
  return out;
}

/** Qualquer uso registrado do portal na semana (Café Conecta e regras operacionais amplas). */
export async function idsComAtividadePortalSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const [graos, presenca, emocional, avisos] = await Promise.all([
    idsGraosLoginSemana(supabase, colaboradorIds, semanaInicio),
    idsComPresencaPortalSemana(supabase, colaboradorIds, semanaInicio),
    idsComEmocionalSemana(supabase, colaboradorIds, semanaInicio),
    idsComAvisoVisualizadoSemana(supabase, colaboradorIds, semanaInicio),
  ]);
  for (const set of [graos, presenca, emocional, avisos]) {
    set.forEach((id) => out.add(id));
  }
  return out;
}

/** Crédito Grãos `login_semana` (não confundir com atividade ampla do portal). */
export async function colaboradorTemGraosLoginSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const ids = await idsGraosLoginSemana(supabase, [colaboradorId], semanaInicio);
  return ids.has(colaboradorId);
}

export async function colaboradorTeveAtividadePortalSemana(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const ids = await idsComAtividadePortalSemana(supabase, [colaboradorId], semanaInicio);
  return ids.has(colaboradorId);
}

/** @deprecated Nome legado — usa atividade ampla do portal, não só Grãos. */
export async function colaboradorAcessouPortalSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  return colaboradorTeveAtividadePortalSemana(supabase, colaboradorId, semanaInicio);
}

export async function idsComAcessoPortalSemanaGraos(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  return idsComAtividadePortalSemana(supabase, colaboradorIds, semanaInicio);
}
