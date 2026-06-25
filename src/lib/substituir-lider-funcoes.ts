import type { createAdminClient } from '@/lib/supabase/admin';
import { SETORES_LIDERANCA_DANIEL_TRANSVERSAL } from '@/lib/config-lideranca-operacional';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { normalizarSetorOrganizacional } from '@/lib/lideranca-org';
import { isSetorLiderancaDanielTransversal } from '@/lib/setores-fabrica-lideranca';
import { podeSerLider } from '@/lib/pode-ser-lider';
import { normalizePortalRole } from '@/lib/roles';
import {
  sincronizarVinculosLiderancaColaborador,
  sincronizarVinculosUnidadeSetor,
} from '@/lib/sincronizar-vinculos-lideranca';
import { ehParidadePlantao } from '@/lib/plantao-12x36';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type VagaLideranca = {
  id: string;
  unidade_id: string;
  setor: string;
  plantao_paridade: string | null;
  plantao_paridade_mes_ref: string | null;
};

export type SubstituirLiderInput = {
  liderAntigoId: string;
  liderNovoId: string;
  unidadeId?: string | null;
  setor?: string | null;
};

export type SubstituirLiderResultado = {
  vagas_transferidas: number;
  vagas_desativadas_duplicata: number;
  colaboradores_sincronizados: number;
  vagas: Array<{
    id: string;
    unidade_id: string;
    setor: string;
    acao: 'transferida' | 'desativada_duplicata';
  }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function setorPermiteLiderDeOutraUnidade(setor: string): boolean {
  if (setor === SETOR_TODOS_NA_UNIDADE) return false;
  return isSetorLiderancaDanielTransversal(normalizarSetorOrganizacional(setor));
}

/** Lista vagas ativas que seriam transferidas (preview, sem alterar). */
export async function listarVagasSubstituicaoLider(
  supabase: SupabaseAdmin,
  input: SubstituirLiderInput
): Promise<{ vagas: VagaLideranca[]; erro?: string }> {
  const antigo = String(input.liderAntigoId ?? '').trim();
  if (!isUuid(antigo)) return { vagas: [], erro: 'lider_antigo_id inválido' };

  let q = supabase
    .from('lideres_por_setor')
    .select('id, unidade_id, setor, plantao_paridade, plantao_paridade_mes_ref')
    .eq('lider_id', antigo)
    .eq('ativo', true);

  const unidadeFiltro = String(input.unidadeId ?? '').trim();
  const setorFiltro = String(input.setor ?? '').trim();
  if (unidadeFiltro) q = q.eq('unidade_id', unidadeFiltro);
  if (setorFiltro) q = q.eq('setor', setorFiltro);

  const { data, error } = await q;
  if (error) {
    if (/plantao_paridade|column .* does not exist/i.test(error.message)) {
      const retry = await supabase
        .from('lideres_por_setor')
        .select('id, unidade_id, setor')
        .eq('lider_id', antigo)
        .eq('ativo', true);
      if (retry.error) return { vagas: [], erro: retry.error.message };
      return {
        vagas: (retry.data ?? []).map((r) => ({
          id: String(r.id),
          unidade_id: String(r.unidade_id),
          setor: String(r.setor),
          plantao_paridade: null,
          plantao_paridade_mes_ref: null,
        })),
      };
    }
    return { vagas: [], erro: error.message };
  }

  return {
    vagas: (data ?? []).map((r) => ({
      id: String(r.id),
      unidade_id: String(r.unidade_id),
      setor: String(r.setor),
      plantao_paridade: ehParidadePlantao(r.plantao_paridade as string)
        ? (r.plantao_paridade as string)
        : null,
      plantao_paridade_mes_ref:
        r.plantao_paridade_mes_ref != null ? String(r.plantao_paridade_mes_ref) : null,
    })),
  };
}

async function validarNovoLider(
  supabase: SupabaseAdmin,
  liderNovoId: string,
  vagas: VagaLideranca[]
): Promise<{ ok: true; unidade_id: string; role: string } | { ok: false; erro: string }> {
  const { data: novo, error } = await supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, unidade_id')
    .eq('id', liderNovoId)
    .maybeSingle();
  if (error || !novo) return { ok: false, erro: 'Novo líder não encontrado' };
  if (
    !podeSerLider(
      (novo as { role?: string }).role,
      (novo as { cargo?: string }).cargo,
      String(novo.nome ?? '')
    )
  ) {
    return { ok: false, erro: 'O novo colaborador não pode ocupar função de liderança (cargo/role).' };
  }

  const unidadeNovo = String(novo.unidade_id ?? '');
  for (const vaga of vagas) {
    if (setorPermiteLiderDeOutraUnidade(vaga.setor)) continue;
    if (unidadeNovo !== vaga.unidade_id) {
      return {
        ok: false,
        erro: `O novo líder precisa ser da mesma unidade da vaga «${vaga.setor}» (transversal CD/Administração/RH permite outra unidade de cadastro).`,
      };
    }
  }

  return {
    ok: true,
    unidade_id: unidadeNovo,
    role: String((novo as { role?: string }).role ?? ''),
  };
}

/**
 * Transfere todas as vagas (funções) do líder antigo para o novo.
 * Plantão e setor permanecem na linha da função; só muda o ocupante (`lider_id`).
 */
export async function substituirLiderFuncoes(
  supabase: SupabaseAdmin,
  input: SubstituirLiderInput
): Promise<SubstituirLiderResultado & { erro?: string }> {
  const antigo = String(input.liderAntigoId ?? '').trim();
  const novo = String(input.liderNovoId ?? '').trim();
  if (!isUuid(antigo) || !isUuid(novo)) {
    return {
      vagas_transferidas: 0,
      vagas_desativadas_duplicata: 0,
      colaboradores_sincronizados: 0,
      vagas: [],
      erro: 'IDs inválidos',
    };
  }
  if (antigo === novo) {
    return {
      vagas_transferidas: 0,
      vagas_desativadas_duplicata: 0,
      colaboradores_sincronizados: 0,
      vagas: [],
      erro: 'Líder antigo e novo são o mesmo',
    };
  }

  const preview = await listarVagasSubstituicaoLider(supabase, input);
  if (preview.erro) {
    return {
      vagas_transferidas: 0,
      vagas_desativadas_duplicata: 0,
      colaboradores_sincronizados: 0,
      vagas: [],
      erro: preview.erro,
    };
  }
  if (preview.vagas.length === 0) {
    return {
      vagas_transferidas: 0,
      vagas_desativadas_duplicata: 0,
      colaboradores_sincronizados: 0,
      vagas: [],
      erro: 'Nenhuma vaga ativa encontrada para o líder antigo neste escopo',
    };
  }

  const val = await validarNovoLider(supabase, novo, preview.vagas);
  if (!val.ok) {
    return {
      vagas_transferidas: 0,
      vagas_desativadas_duplicata: 0,
      colaboradores_sincronizados: 0,
      vagas: [],
      erro: val.erro,
    };
  }

  if (normalizePortalRole(val.role) === 'colaborador') {
    await supabase
      .from('colaboradores')
      .update({ role: 'gerente', updated_at: new Date().toISOString() })
      .eq('id', novo);
  }

  const agora = new Date().toISOString();
  const vagasOut: SubstituirLiderResultado['vagas'] = [];
  const paresSync = new Set<string>();
  let transferidas = 0;
  let desativadas = 0;

  for (const vaga of preview.vagas) {
    const { data: existenteNovo } = await supabase
      .from('lideres_por_setor')
      .select('id, plantao_paridade, plantao_paridade_mes_ref')
      .eq('unidade_id', vaga.unidade_id)
      .eq('setor', vaga.setor)
      .eq('lider_id', novo)
      .eq('ativo', true)
      .maybeSingle();

    if (existenteNovo?.id) {
      const { error: offErr } = await supabase
        .from('lideres_por_setor')
        .update({ ativo: false, updated_at: agora })
        .eq('id', vaga.id);
      if (offErr) throw new Error(offErr.message);
      desativadas += 1;
      vagasOut.push({
        id: vaga.id,
        unidade_id: vaga.unidade_id,
        setor: vaga.setor,
        acao: 'desativada_duplicata',
      });

      if (vaga.plantao_paridade && !existenteNovo.plantao_paridade) {
        await supabase
          .from('lideres_por_setor')
          .update({
            plantao_paridade: vaga.plantao_paridade,
            plantao_paridade_mes_ref: vaga.plantao_paridade_mes_ref,
            updated_at: agora,
          })
          .eq('id', String(existenteNovo.id));
      }
    } else {
      const { error: upErr } = await supabase
        .from('lideres_por_setor')
        .update({ lider_id: novo, updated_at: agora })
        .eq('id', vaga.id);
      if (upErr) throw new Error(upErr.message);
      transferidas += 1;
      vagasOut.push({
        id: vaga.id,
        unidade_id: vaga.unidade_id,
        setor: vaga.setor,
        acao: 'transferida',
      });
    }
    paresSync.add(`${vaga.unidade_id}|${vaga.setor}`);
  }

  await supabase
    .from('colaboradores_lideres')
    .update({ lider_id: novo, updated_at: agora })
    .eq('lider_id', antigo)
    .eq('ativo', true);

  await supabase.from('colaboradores').update({ lider_id: novo }).eq('lider_id', antigo);

  let sincronizados = 0;
  for (const par of Array.from(paresSync)) {
    const [uid, setor] = par.split('|');
    const sync = await sincronizarVinculosUnidadeSetor(supabase, uid, setor);
    sincronizados += sync.sincronizados;
  }

  await sincronizarVinculosLiderancaColaborador(supabase, novo);

  return {
    vagas_transferidas: transferidas,
    vagas_desativadas_duplicata: desativadas,
    colaboradores_sincronizados: sincronizados,
    vagas: vagasOut,
  };
}

/** Setores transversais (CD, RH, etc.) para exibição no admin. */
export const SETORES_TRANSVERSAIS_LIDERANCA = [...SETORES_LIDERANCA_DANIEL_TRANSVERSAL] as const;
