import type { SupabaseClient } from '@supabase/supabase-js';

/** Segunda 00:00 America/Sao_Paulo (UTC-3) em ISO. */
function inicioSemanaUtcIso(semanaInicio: string): string {
  return `${semanaInicio}T03:00:00.000Z`;
}

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

  const desde = inicioSemanaUtcIso(semanaInicio);
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

/** Lote: ids com acesso ao portal na semana (Grãos login_semana ou ping desde segunda). */
async function idsComAcessoPortalSemana(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  const out = new Set<string>();
  if (colaboradorIds.length === 0) return out;

  const [graos, presenca] = await Promise.all([
    idsGraosLoginSemana(supabase, colaboradorIds, semanaInicio),
    idsComPresencaPortalSemana(supabase, colaboradorIds, semanaInicio),
  ]);
  graos.forEach((id) => out.add(id));
  presenca.forEach((id) => out.add(id));
  return out;
}

/** Mesma regra dos 5 Grãos «Entrar no portal esta semana» (`login_semana`), mais presença no app. */
export async function colaboradorAcessouPortalSemanaGraos(
  supabase: SupabaseClient,
  colaboradorId: string,
  semanaInicio: string
): Promise<boolean> {
  const ids = await idsComAcessoPortalSemana(supabase, [colaboradorId], semanaInicio);
  return ids.has(colaboradorId);
}

export async function idsComAcessoPortalSemanaGraos(
  supabase: SupabaseClient,
  colaboradorIds: string[],
  semanaInicio: string
): Promise<Set<string>> {
  return idsComAcessoPortalSemana(supabase, colaboradorIds, semanaInicio);
}
