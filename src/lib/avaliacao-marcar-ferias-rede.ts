import type { SupabaseClient } from '@supabase/supabase-js';
import {
  aplicarEfeitosFeriasSemanaColaborador,
  colaboradorDeFeriasNaSemana,
} from '@/lib/avaliacao-ferias-semana';
import {
  insertAvaliacaoDiariaCompat,
  updateAvaliacaoDiariaCompat,
} from '@/lib/avaliacoes-justificativa-compat';
import { validarBodyAvaliacaoSemanal } from '@/lib/avaliacao-semanal-submit';
import { normalizePortalRole } from '@/lib/roles';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';

export type ResultadoMarcarFeriasRede =
  | { ok: true; ja_estava: boolean; colaborador_nome: string }
  | { ok: false; status: number; erro: string };

/** Registra férias na semana (rede/admin), fecha pendência de líder. */
export async function marcarFeriasSemanaRede(
  supabase: SupabaseClient,
  opts: { colaboradorAlvoId: string; dataIso: string; avaliadorId: string }
): Promise<ResultadoMarcarFeriasRede> {
  const dataRef = inicioSemanaSegundaFeiraLocal(opts.dataIso);

  const { data: alvo, error: errAlvo } = await supabase
    .from('colaboradores')
    .select('id, nome, role')
    .eq('id', opts.colaboradorAlvoId)
    .maybeSingle();

  if (errAlvo) {
    return { ok: false, status: 500, erro: errAlvo.message };
  }
  if (!alvo?.id || normalizePortalRole((alvo as { role?: string }).role) !== 'colaborador') {
    return { ok: false, status: 404, erro: 'Colaborador não encontrado.' };
  }

  const nome = String((alvo as { nome?: string }).nome ?? 'Colaborador');

  if (await colaboradorDeFeriasNaSemana(supabase, opts.colaboradorAlvoId, dataRef)) {
    return { ok: true, ja_estava: true, colaborador_nome: nome };
  }

  const validado = validarBodyAvaliacaoSemanal(
    {
      data_referencia: dataRef,
      colaborador_id: opts.colaboradorAlvoId,
      assiduidade: 'ferias',
      nota_vestimenta: null,
      nota_pontualidade: null,
      nota_trabalho_equipe: null,
      nota_desempenho_tarefas: null,
      nota_proatividade: null,
      justificativa_nota_baixa: '',
    },
    dataRef
  );

  if (!validado.ok) {
    return { ok: false, status: validado.status, erro: validado.erro };
  }

  const { data: existente } = await supabase
    .from('avaliacoes_diarias')
    .select('id')
    .eq('colaborador_id', opts.colaboradorAlvoId)
    .eq('avaliador_id', opts.avaliadorId)
    .eq('data_referencia', dataRef)
    .maybeSingle();

  if (existente?.id) {
    const { error: updErr } = await updateAvaliacaoDiariaCompat(supabase, String(existente.id), validado.row);
    if (updErr) return { ok: false, status: 500, erro: updErr };
  } else {
    const { error: insErr } = await insertAvaliacaoDiariaCompat(supabase, {
      ...validado.row,
      avaliador_id: opts.avaliadorId,
    });
    if (insErr) return { ok: false, status: 500, erro: insErr };
  }

  const { reprocessarGraosAposAvaliacaoEquipe } = await import('@/lib/graos/sync-hook');
  await reprocessarGraosAposAvaliacaoEquipe(supabase, opts.colaboradorAlvoId, dataRef);
  await aplicarEfeitosFeriasSemanaColaborador(supabase, opts.colaboradorAlvoId, dataRef);

  return { ok: true, ja_estava: false, colaborador_nome: nome };
}
