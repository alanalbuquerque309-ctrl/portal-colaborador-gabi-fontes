import type { SupabaseClient } from '@supabase/supabase-js';

/** Atualiza último uso do portal (login ou heartbeat). Falha silenciosa se tabela ausente. */
export async function registrarPresencaPortal(
  supabase: SupabaseClient,
  colaboradorId: string
): Promise<void> {
  if (!colaboradorId || colaboradorId === 'pending') return;
  try {
    await supabase.from('portal_presenca').upsert(
      { colaborador_id: colaboradorId, ultimo_ping_at: new Date().toISOString() },
      { onConflict: 'colaborador_id' }
    );
  } catch {
    /* tabela pode não existir em ambientes antigos */
  }
}
