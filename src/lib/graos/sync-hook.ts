import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePortalRole } from '@/lib/roles';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { sincronizarMissoesSemanaGraos } from '@/lib/graos/missoes';

/** Dispara sync de missões (silencioso se tabela ausente). */
export async function syncGraosColaboradorSeAplicavel(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<void> {
  try {
    const { data } = await supabase.from('colaboradores').select('role').eq('id', colaboradorId).maybeSingle();
    if (!data || normalizePortalRole((data as { role?: string }).role) !== 'colaborador') return;
    await sincronizarMissoesSemanaGraos(supabase, colaboradorId, segundaSemanaSaoPaulo());
  } catch {
    /* migração pendente ou erro não bloqueia fluxo principal */
  }
}

export async function reprocessarGraosAposAvaliacaoEquipe(
  supabase: SupabaseClient,
  colaboradorAlvoId: string,
  semanaInicio: string
): Promise<void> {
  try {
    await sincronizarMissoesSemanaGraos(supabase, colaboradorAlvoId, semanaInicio);
  } catch {
    /* noop */
  }
}
