'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function finalizarOnboarding(
  colaboradorId: string
): Promise<{ ok: boolean; erro?: string; unidade_id?: string; role?: string }> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!colaboradorId || !uuidRegex.test(colaboradorId)) {
    return { ok: false, erro: 'ID inválido' };
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error: fetchErr } = await supabase
      .from('colaboradores')
      .select('unidade_id, role')
      .eq('id', colaboradorId)
      .single();
    if (fetchErr || !col) return { ok: false, erro: 'Colaborador não encontrado' };

    const { error } = await supabase
      .from('colaboradores')
      .update({
        onboarding_completo: true,
        termo_aceite_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', colaboradorId);

    if (error) return { ok: false, erro: error.message };
    return { ok: true, unidade_id: col.unidade_id, role: (col as { role?: string }).role };
  } catch (e) {
    return { ok: false, erro: 'Erro ao finalizar. Tente novamente.' };
  }
}
