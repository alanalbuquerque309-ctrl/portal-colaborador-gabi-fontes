import type { SupabaseClient } from '@supabase/supabase-js';
import {
  colaboradorDeLicencaOuAfastamentoNaSemana,
  colaboradorDeLicencaOuAfastamentoNasLinhas,
} from '@/lib/avaliacao-licenca-semana';
import {
  insertAvaliacaoDiariaCompat,
  updateAvaliacaoDiariaCompat,
} from '@/lib/avaliacoes-justificativa-compat';
import { assiduidadeParaBanco, JUSTIFICATIVA_LICENCA_SEMANA } from '@/lib/avaliacao-semanal-shared';
import { normalizePortalRole } from '@/lib/roles';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';

export type ResultadoMarcarLicencaRede =
  | { ok: true; ja_estava: boolean; colaborador_nome: string }
  | { ok: false; status: number; erro: string };

/** Registra licença/afastamento na semana (rede/admin), fecha pendências da semana. */
export async function marcarLicencaSemanaRede(
  supabase: SupabaseClient,
  opts: { colaboradorAlvoId: string; dataIso: string; avaliadorId: string }
): Promise<ResultadoMarcarLicencaRede> {
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

  if (await colaboradorDeLicencaOuAfastamentoNaSemana(supabase, opts.colaboradorAlvoId, dataRef)) {
    return { ok: true, ja_estava: true, colaborador_nome: nome };
  }

  const row = {
    colaborador_id: opts.colaboradorAlvoId,
    data_referencia: dataRef,
    assiduidade: assiduidadeParaBanco('falta_justificada'),
    nota_vestimenta: null,
    nota_pontualidade: null,
    nota_trabalho_equipe: null,
    nota_desempenho_tarefas: null,
    nota_proatividade: null,
    media_dia: null,
    justificativa_nota_baixa: JUSTIFICATIVA_LICENCA_SEMANA,
  };

  const { data: existente } = await supabase
    .from('avaliacoes_diarias')
    .select('id, assiduidade, justificativa_nota_baixa')
    .eq('colaborador_id', opts.colaboradorAlvoId)
    .eq('avaliador_id', opts.avaliadorId)
    .eq('data_referencia', dataRef)
    .maybeSingle();

  if (existente?.id) {
    const { error: updErr } = await updateAvaliacaoDiariaCompat(supabase, String(existente.id), row);
    if (updErr) return { ok: false, status: 500, erro: updErr };
  } else {
    const { error: insErr } = await insertAvaliacaoDiariaCompat(supabase, {
      ...row,
      avaliador_id: opts.avaliadorId,
    });
    if (insErr) return { ok: false, status: 500, erro: insErr };
  }

  const { data: linhasSemana } = await supabase
    .from('avaliacoes_diarias')
    .select('assiduidade, justificativa_nota_baixa, ignorada')
    .eq('colaborador_id', opts.colaboradorAlvoId)
    .eq('data_referencia', dataRef);

  if (!colaboradorDeLicencaOuAfastamentoNasLinhas((linhasSemana ?? []) as Record<string, unknown>[])) {
    return { ok: false, status: 500, erro: 'Não foi possível confirmar o registro de licença.' };
  }

  const { reprocessarGraosAposAvaliacaoEquipe } = await import('@/lib/graos/sync-hook');
  await reprocessarGraosAposAvaliacaoEquipe(supabase, opts.colaboradorAlvoId, dataRef);

  return { ok: true, ja_estava: false, colaborador_nome: nome };
}
