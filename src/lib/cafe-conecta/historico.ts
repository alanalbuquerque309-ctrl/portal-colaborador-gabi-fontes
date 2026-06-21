import type { SupabaseClient } from '@supabase/supabase-js';
import { chaveDupla } from '@/lib/cafe-conecta/sorteio';
import { rotuloSetorCafeConecta } from '@/lib/cafe-conecta/areas';
import type { CafeConectaParticipanteCard } from '@/lib/cafe-conecta/types';
import type {
  CafeConectaDuplaHistorico,
  CafeConectaMetricasEngajamento,
  CafeConectaParticipacaoPerfil,
  CafeConectaResumoPerfil,
} from '@/lib/cafe-conecta/types';
import { CAFE_CONECTA_REACOES, isReacaoCafeConectaValida } from '@/lib/cafe-conecta/feedback';

export type {
  CafeConectaDuplaHistorico,
  CafeConectaMetricasEngajamento,
  CafeConectaParticipacaoPerfil,
  CafeConectaResumoPerfil,
};

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export async function listarHistoricoDuplasGrupo(
  supabase: SupabaseClient,
  grupoSlug: string,
  limite = 30
): Promise<CafeConectaDuplaHistorico[]> {
  const { data: sorteios, error } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id, data_referencia')
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado')
    .order('data_referencia', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const ids = (sorteios ?? []).map((s) => String(s.id));
  if (ids.length === 0) return [];

  const { data: pessoas, error: errP } = await supabase
    .from('cafe_conecta_sorteio_pessoas')
    .select('sorteio_id, colaborador_id, ordem, nome_snapshot, setor_snapshot')
    .in('sorteio_id', ids);
  if (errP) throw new Error(errP.message);

  const dataPorSorteio = new Map((sorteios ?? []).map((s) => [String(s.id), String(s.data_referencia)]));
  const porSorteio = new Map<string, CafeConectaParticipanteCard[]>();

  for (const row of pessoas ?? []) {
    const sid = String(row.sorteio_id);
    const list = porSorteio.get(sid) ?? [];
    list.push({
      ordem: Number(row.ordem),
      colaborador_id: String(row.colaborador_id),
      nome: String(row.nome_snapshot),
      setor: row.setor_snapshot as string | null,
      setor_label: rotuloSetorCafeConecta(row.setor_snapshot as string | null),
      unidade_nome: '',
    });
    porSorteio.set(sid, list);
  }

  const agregado = new Map<string, CafeConectaDuplaHistorico>();

  for (const [sid, parts] of Array.from(porSorteio.entries())) {
    if (parts.length < 2) continue;
    const sorted = parts.sort((a, b) => a.ordem - b.ordem);
    const a = sorted[0];
    const b = sorted[1];
    const key = chaveDupla(a.colaborador_id, b.colaborador_id);
    const dataRef = dataPorSorteio.get(sid) ?? '';
    const prev = agregado.get(key);
    if (!prev) {
      agregado.set(key, {
        chave: key,
        vezes: 1,
        ultima_data: dataRef,
        pessoa_a: { nome: a.nome, setor_label: a.setor_label },
        pessoa_b: { nome: b.nome, setor_label: b.setor_label },
      });
    } else {
      prev.vezes += 1;
      if (dataRef > prev.ultima_data) prev.ultima_data = dataRef;
    }
  }

  return Array.from(agregado.values())
    .sort((x, y) => y.ultima_data.localeCompare(x.ultima_data) || y.vezes - x.vezes)
    .slice(0, limite);
}

export async function metricasEngajamentoGrupo(
  supabase: SupabaseClient,
  grupoSlug: string,
  semanaInicio: string
): Promise<CafeConectaMetricasEngajamento> {
  const por_reacao: Record<string, number> = {};
  for (const r of CAFE_CONECTA_REACOES) por_reacao[r.id] = 0;

  const { count: sorteiosCount, error: errS } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado');

  if (errS) throw new Error(errS.message);

  const { data: sorteiosSemana } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id')
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado')
    .eq('semana_inicio', semanaInicio);

  const idsSemana = (sorteiosSemana ?? []).map((s) => String(s.id));

  let feedback_total = 0;
  let feedback_semana = 0;

  const { data: sorteioIds } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id')
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado');

  const allIds = (sorteioIds ?? []).map((s) => String(s.id));
  if (allIds.length === 0) {
    return {
      sorteios_publicados: sorteiosCount ?? 0,
      feedback_total: 0,
      feedback_semana: 0,
      por_reacao,
    };
  }

  const { data: todosFb, error: errF } = await supabase
    .from('cafe_conecta_feedback')
    .select('reacao, sorteio_id')
    .in('sorteio_id', allIds);

  if (errF) {
    if (/cafe_conecta_feedback/i.test(errF.message)) {
      return {
        sorteios_publicados: sorteiosCount ?? 0,
        feedback_total: 0,
        feedback_semana: 0,
        por_reacao,
      };
    }
    throw new Error(errF.message);
  }

  for (const row of todosFb ?? []) {
    feedback_total += 1;
    const rid = String(row.reacao ?? '');
    if (isReacaoCafeConectaValida(rid)) por_reacao[rid] = (por_reacao[rid] ?? 0) + 1;
    if (idsSemana.includes(String(row.sorteio_id))) feedback_semana += 1;
  }

  return {
    sorteios_publicados: sorteiosCount ?? 0,
    feedback_total,
    feedback_semana,
    por_reacao,
  };
}

export async function resumoPerfilCafeConecta(
  supabase: SupabaseClient,
  colaboradorId: string,
  grupoSlug: string
): Promise<CafeConectaResumoPerfil> {
  const { data: pessoas, error } = await supabase
    .from('cafe_conecta_sorteio_pessoas')
    .select('sorteio_id')
    .eq('colaborador_id', colaboradorId);

  if (error) throw new Error(error.message);
  const meusSorteios = (pessoas ?? []).map((p) => String(p.sorteio_id));
  if (meusSorteios.length === 0) {
    return { total_participacoes: 0, dias_desde_ultima: null, participacoes: [] };
  }

  const { data: sorteios, error: errS } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id, data_referencia, ciclo_id')
    .in('id', meusSorteios)
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado')
    .order('data_referencia', { ascending: false });

  if (errS) throw new Error(errS.message);

  const cicloIds = Array.from(new Set((sorteios ?? []).map((s) => String(s.ciclo_id)).filter(Boolean)));
  const cicloNumero = new Map<string, number>();
  if (cicloIds.length > 0) {
    const { data: ciclos } = await supabase.from('cafe_conecta_ciclos').select('id, numero').in('id', cicloIds);
    for (const c of ciclos ?? []) cicloNumero.set(String(c.id), Number(c.numero) || 1);
  }

  const participacoes: CafeConectaParticipacaoPerfil[] = [];

  for (const s of sorteios ?? []) {
    const sorteioId = String(s.id);
    const { data: todos } = await supabase
      .from('cafe_conecta_sorteio_pessoas')
      .select('colaborador_id, nome_snapshot, setor_snapshot')
      .eq('sorteio_id', sorteioId);

    const par = (todos ?? []).find((t) => String(t.colaborador_id) !== colaboradorId);
    if (!par) continue;

    participacoes.push({
      sorteio_id: sorteioId,
      data_referencia: String(s.data_referencia),
      parceiro_nome: String(par.nome_snapshot),
      parceiro_setor: rotuloSetorCafeConecta(par.setor_snapshot as string | null),
      ciclo_numero: cicloNumero.get(String(s.ciclo_id)) ?? 1,
    });
  }

  const ultima = participacoes[0]?.data_referencia ?? null;

  return {
    total_participacoes: participacoes.length,
    dias_desde_ultima: diasDesde(ultima),
    participacoes: participacoes.slice(0, 12),
  };
}

export async function registrarFeedbackCafeConecta(
  supabase: SupabaseClient,
  sorteioId: string,
  colaboradorId: string,
  reacao: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!isReacaoCafeConectaValida(reacao)) {
    return { ok: false, erro: 'Reação inválida.' };
  }

  const { data: sorteio, error: errS } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id, status')
    .eq('id', sorteioId)
    .maybeSingle();

  if (errS) throw new Error(errS.message);
  if (!sorteio || sorteio.status !== 'publicado') {
    return { ok: false, erro: 'Sorteio não encontrado ou ainda não publicado.' };
  }

  const { error } = await supabase.from('cafe_conecta_feedback').upsert(
    {
      sorteio_id: sorteioId,
      colaborador_id: colaboradorId,
      reacao,
    },
    { onConflict: 'sorteio_id,colaborador_id' }
  );

  if (error) {
    if (/cafe_conecta_feedback/i.test(error.message)) {
      return { ok: false, erro: 'Feedback indisponível (migration 053 pendente).' };
    }
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function minhaReacaoSorteio(
  supabase: SupabaseClient,
  sorteioId: string,
  colaboradorId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('cafe_conecta_feedback')
    .select('reacao')
    .eq('sorteio_id', sorteioId)
    .eq('colaborador_id', colaboradorId)
    .maybeSingle();

  if (error) {
    if (/cafe_conecta_feedback/i.test(error.message)) return null;
    throw new Error(error.message);
  }
  return data?.reacao ? String(data.reacao) : null;
}

export async function contagemFeedbackSorteio(
  supabase: SupabaseClient,
  sorteioId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('cafe_conecta_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('sorteio_id', sorteioId);

  if (error) {
    if (/cafe_conecta_feedback/i.test(error.message)) return 0;
    throw new Error(error.message);
  }
  return count ?? 0;
}
