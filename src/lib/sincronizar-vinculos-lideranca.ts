import type { createAdminClient } from '@/lib/supabase/admin';
import { listarLideresConfigPorUnidadeSetor } from '@/lib/lideres-por-setor';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/**
 * Materializa em `colaboradores_lideres` os líderes derivados da config (unidade/setor).
 * Mantém vínculos manuais extra que não estão na config. Atualiza `lider_id` (primeiro líder).
 */
export async function sincronizarVinculosLiderancaColaborador(
  supabase: SupabaseAdmin,
  colaboradorId: string
): Promise<{ lideres_ids: string[]; erro?: string }> {
  const { data: colab, error: errC } = await supabase
    .from('colaboradores')
    .select('id, unidade_id, setor, role, lider_id')
    .eq('id', colaboradorId)
    .maybeSingle();

  if (errC || !colab) return { lideres_ids: [], erro: 'Colaborador não encontrado' };

  const role = normalizePortalRole((colab as { role?: string }).role);
  if (role !== 'colaborador') {
    await supabase
      .from('colaboradores_lideres')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('colaborador_id', colaboradorId);
    await supabase.from('colaboradores').update({ lider_id: null }).eq('id', colaboradorId);
    return { lideres_ids: [] };
  }

  const unidadeId = colab.unidade_id as string | null;
  const setor = colab.setor as string | null;
  if (!unidadeId) {
    return { lideres_ids: [], erro: 'Unidade é necessária para vincular líderes' };
  }

  let derivados: Array<{ id: string }> = [];
  try {
    derivados = await listarLideresConfigPorUnidadeSetor(supabase, unidadeId, setor?.trim() || null);
  } catch (e) {
    return { lideres_ids: [], erro: e instanceof Error ? e.message : 'Erro ao resolver líderes' };
  }

  const idsDerivados = derivados.map((l) => l.id).filter((id) => id !== colaboradorId);
  const derivadosSet = new Set(idsDerivados);

  const { data: vinculosAtivos } = await supabase
    .from('colaboradores_lideres')
    .select('lider_id')
    .eq('colaborador_id', colaboradorId)
    .eq('ativo', true);

  const agora = new Date().toISOString();
  for (const v of vinculosAtivos ?? []) {
    const lid = String(v.lider_id ?? '');
    if (lid && !derivadosSet.has(lid)) {
      await supabase
        .from('colaboradores_lideres')
        .update({ ativo: false, updated_at: agora })
        .eq('colaborador_id', colaboradorId)
        .eq('lider_id', lid);
    }
  }

  for (const lid of idsDerivados) {
    await supabase.from('colaboradores_lideres').upsert(
      {
        colaborador_id: colaboradorId,
        lider_id: lid,
        ativo: true,
        updated_at: agora,
      },
      { onConflict: 'colaborador_id,lider_id' }
    );
  }

  const primeiro = idsDerivados[0] ?? null;
  await supabase
    .from('colaboradores')
    .update({
      lider_id: primeiro,
      updated_at: new Date().toISOString(),
    })
    .eq('id', colaboradorId);

  return { lideres_ids: idsDerivados };
}

/** Reaplica vínculos derivados para todos os colaboradores com setor preenchido. */
export async function sincronizarVinculosTodosColaboradores(
  supabase: SupabaseAdmin
): Promise<{ processados: number; com_lider: number; sem_setor: number; erros: string[] }> {
  const { data: rows, error } = await supabase
    .from('colaboradores')
    .select('id, setor, role')
    .eq('role', 'colaborador');

  if (error) throw new Error(error.message);

  let processados = 0;
  let com_lider = 0;
  let sem_setor = 0;
  const erros: string[] = [];

  for (const row of rows ?? []) {
    const id = String(row.id);
    if (!String(row.setor ?? '').trim()) {
      sem_setor += 1;
    }
    processados += 1;
    const r = await sincronizarVinculosLiderancaColaborador(supabase, id);
    if (r.erro) erros.push(`${id}: ${r.erro}`);
    else if (r.lideres_ids.length > 0) com_lider += 1;
  }

  return { processados, com_lider, sem_setor, erros };
}
