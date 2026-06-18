import type { SupabaseClient } from '@supabase/supabase-js';
import { podeParticiparGraosCafe } from '@/lib/roles';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { sincronizarMissoesSemanaGraos } from '@/lib/graos/missoes';

/** Dispara sync de missões (silencioso se tabela ausente). */
export async function syncGraosColaboradorSeAplicavel(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<void> {
  try {
    const { data } = await supabase.from('colaboradores').select('role').eq('id', colaboradorId).maybeSingle();
    if (!data || !podeParticiparGraosCafe((data as { role?: string }).role)) return;
    await sincronizarMissoesSemanaGraos(supabase, colaboradorId, segundaSemanaSaoPaulo(), { creditarLogin: false });
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
    await sincronizarMissoesSemanaGraos(supabase, colaboradorAlvoId, semanaInicio, { creditarLogin: false });
  } catch {
    /* noop */
  }
}
