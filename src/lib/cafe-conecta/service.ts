import type { SupabaseClient } from '@supabase/supabase-js';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { rotuloSetorCafeConecta } from '@/lib/cafe-conecta/areas';
import type { CafeConectaGrupoConfig } from '@/lib/cafe-conecta/config';
import {
  avaliarElegibilidadeSemanaCafeConecta,
  contagemMotivosElegibilidade,
  listarBaseOperacionalGrupo,
} from '@/lib/cafe-conecta/elegibilidade';
import { deveExibirAlertaCafeConectaQuinta, quartaReferenciaSemanaSaoPaulo } from '@/lib/cafe-conecta/quarta';
import { chaveDupla, prepararCandidatosSorteio, sortearDuplaCafeConecta } from '@/lib/cafe-conecta/sorteio';
import type {
  CafeConectaCicloResumo,
  CafeConectaDashboardPayload,
  CafeConectaHistoricoItem,
  CafeConectaParticipanteCard,
  CafeConectaSorteioRow,
} from '@/lib/cafe-conecta/types';
import {
  listarHistoricoDuplasGrupo,
  metricasEngajamentoGrupo,
} from '@/lib/cafe-conecta/historico';
import type { CafeConectaDuplaHistorico, CafeConectaMetricasEngajamento } from '@/lib/cafe-conecta/types';

function tabelaAusente(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    (m.includes('cafe_conecta') || m.includes('schema cache')) &&
    (m.includes('does not exist') || m.includes('relation') || m.includes('schema cache'))
  );
}

function mapParticipantes(
  rows: Array<{
    ordem: number;
    colaborador_id: string;
    nome_snapshot: string;
    setor_snapshot: string | null;
    unidade_nome_snapshot: string | null;
  }>
): CafeConectaParticipanteCard[] {
  return rows
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => ({
      ordem: p.ordem,
      colaborador_id: String(p.colaborador_id),
      nome: String(p.nome_snapshot),
      setor: p.setor_snapshot,
      setor_label: rotuloSetorCafeConecta(p.setor_snapshot),
      unidade_nome: String(p.unidade_nome_snapshot ?? ''),
    }));
}

async function carregarParticipantesSorteio(
  supabase: SupabaseClient,
  sorteioId: string
): Promise<CafeConectaParticipanteCard[]> {
  const { data, error } = await supabase
    .from('cafe_conecta_sorteio_pessoas')
    .select('ordem, colaborador_id, nome_snapshot, setor_snapshot, unidade_nome_snapshot')
    .eq('sorteio_id', sorteioId)
    .order('ordem', { ascending: true });
  if (error) throw new Error(error.message);
  return mapParticipantes((data ?? []) as Parameters<typeof mapParticipantes>[0]);
}

export async function obterOuCriarCicloAtivo(
  supabase: SupabaseClient,
  grupoSlug: string
): Promise<{ id: string; numero: number }> {
  const { data: ativo, error: errA } = await supabase
    .from('cafe_conecta_ciclos')
    .select('id, numero')
    .eq('grupo_slug', grupoSlug)
    .is('encerrado_em', null)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errA) throw new Error(errA.message);
  if (ativo?.id) return { id: String(ativo.id), numero: Number(ativo.numero) || 1 };

  const { data: ultimo } = await supabase
    .from('cafe_conecta_ciclos')
    .select('numero')
    .eq('grupo_slug', grupoSlug)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();

  const numero = (Number(ultimo?.numero) || 0) + 1;
  const { data: novo, error: errN } = await supabase
    .from('cafe_conecta_ciclos')
    .insert({ grupo_slug: grupoSlug, numero })
    .select('id, numero')
    .single();

  if (errN) throw new Error(errN.message);
  return { id: String(novo!.id), numero: Number(novo!.numero) };
}

async function idsParticiparamCiclo(supabase: SupabaseClient, cicloId: string): Promise<Set<string>> {
  const { data: sorteios, error } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id')
    .eq('ciclo_id', cicloId)
    .eq('status', 'publicado');
  if (error) throw new Error(error.message);
  const ids = (sorteios ?? []).map((s) => String(s.id));
  if (ids.length === 0) return new Set();

  const { data: pessoas, error: errP } = await supabase
    .from('cafe_conecta_sorteio_pessoas')
    .select('colaborador_id')
    .in('sorteio_id', ids);
  if (errP) throw new Error(errP.message);
  return new Set((pessoas ?? []).map((p) => String(p.colaborador_id)));
}

async function mapParticipacoesHistorico(
  supabase: SupabaseClient,
  grupoSlug: string
): Promise<{ ciclo: Map<string, number>; total: Map<string, number>; pares: Set<string> }> {
  const ciclo = new Map<string, number>();
  const total = new Map<string, number>();
  const pares = new Set<string>();

  const { data: sorteios, error } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id, ciclo_id, status')
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado');
  if (error) throw new Error(error.message);

  const sorteioIds = (sorteios ?? []).map((s) => String(s.id));
  if (sorteioIds.length === 0) return { ciclo, total, pares };

  const { data: pessoas, error: errP } = await supabase
    .from('cafe_conecta_sorteio_pessoas')
    .select('sorteio_id, colaborador_id, ordem')
    .in('sorteio_id', sorteioIds);
  if (errP) throw new Error(errP.message);

  const porSorteio = new Map<string, string[]>();
  for (const row of pessoas ?? []) {
    const sid = String(row.sorteio_id);
    const list = porSorteio.get(sid) ?? [];
    list.push(String(row.colaborador_id));
    porSorteio.set(sid, list);
  }

  const cicloAtivo = await obterOuCriarCicloAtivo(supabase, grupoSlug);
  const idsCicloAtivo = await idsParticiparamCiclo(supabase, cicloAtivo.id);

  for (const row of pessoas ?? []) {
    const cid = String(row.colaborador_id);
    total.set(cid, (total.get(cid) ?? 0) + 1);
    if (idsCicloAtivo.has(cid)) {
      ciclo.set(cid, (ciclo.get(cid) ?? 0) + 1);
    }
  }

  for (const ids of Array.from(porSorteio.values())) {
    if (ids.length >= 2) pares.add(chaveDupla(ids[0], ids[1]));
  }

  return { ciclo, total, pares };
}

async function buscarSorteioSemana(
  supabase: SupabaseClient,
  grupoSlug: string,
  semanaInicio: string,
  status?: 'rascunho' | 'publicado'
): Promise<CafeConectaSorteioRow | null> {
  let q = supabase
    .from('cafe_conecta_sorteios')
    .select(
      'id, grupo_slug, ciclo_id, semana_inicio, data_referencia, status, seed, excecao_ciclo_impar, observacao_admin, publicado_por, publicado_em'
    )
    .eq('grupo_slug', grupoSlug)
    .eq('semana_inicio', semanaInicio)
    .order('created_at', { ascending: false })
    .limit(1);

  if (status) q = q.eq('status', status);

  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const participantes = await carregarParticipantesSorteio(supabase, String(data.id));
  let publicado_por_nome: string | null = null;
  if (data.publicado_por) {
    const { data: pub } = await supabase
      .from('colaboradores')
      .select('nome')
      .eq('id', data.publicado_por)
      .maybeSingle();
    publicado_por_nome = pub?.nome ? String(pub.nome) : null;
  }

  return {
    ...(data as CafeConectaSorteioRow),
    publicado_por_nome,
    participantes,
  };
}

async function montarResumoCiclo(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig,
  cicloId: string,
  cicloNumero: number
): Promise<CafeConectaCicloResumo> {
  const base = await listarBaseOperacionalGrupo(supabase, grupo);
  const participaram = await idsParticiparamCiclo(supabase, cicloId);
  const total_base = base.length;
  const n = participaram.size;
  const restantes = Math.max(0, total_base - n);
  const pct = total_base > 0 ? Math.round((n / total_base) * 100) : 0;
  return {
    id: cicloId,
    numero: cicloNumero,
    participaram: n,
    total_base,
    restantes,
    pct,
  };
}

async function listarHistoricoGrupo(
  supabase: SupabaseClient,
  grupoSlug: string,
  limite = 20
): Promise<CafeConectaHistoricoItem[]> {
  const { data: sorteios, error } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id, data_referencia, semana_inicio, status, publicado_em, publicado_por, ciclo_id')
    .eq('grupo_slug', grupoSlug)
    .eq('status', 'publicado')
    .order('publicado_em', { ascending: false })
    .limit(limite);

  if (error) throw new Error(error.message);

  const cicloIds = Array.from(new Set((sorteios ?? []).map((s) => String(s.ciclo_id)).filter(Boolean)));
  const cicloNumeroPorId = new Map<string, number>();
  if (cicloIds.length > 0) {
    const { data: ciclos } = await supabase.from('cafe_conecta_ciclos').select('id, numero').in('id', cicloIds);
    for (const c of ciclos ?? []) {
      cicloNumeroPorId.set(String(c.id), Number(c.numero) || 1);
    }
  }

  const out: CafeConectaHistoricoItem[] = [];
  for (const s of sorteios ?? []) {
    const participantes = await carregarParticipantesSorteio(supabase, String(s.id));
    let publicado_por_nome: string | null = null;
    if (s.publicado_por) {
      const { data: pub } = await supabase.from('colaboradores').select('nome').eq('id', s.publicado_por).maybeSingle();
      publicado_por_nome = pub?.nome ? String(pub.nome) : null;
    }
    const cicloNum = cicloNumeroPorId.get(String(s.ciclo_id)) ?? 1;
    out.push({
      id: String(s.id),
      data_referencia: String(s.data_referencia),
      semana_inicio: String(s.semana_inicio),
      status: String(s.status),
      ciclo_numero: cicloNum,
      publicado_por_nome,
      publicado_em: s.publicado_em ? String(s.publicado_em) : null,
      participantes,
    });
  }
  return out;
}

export async function montarDashboardCafeConecta(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig
): Promise<CafeConectaDashboardPayload | { ok: false; code: 'tabelas_ausentes'; erro: string }> {
  try {
    const semanaInicio = segundaSemanaSaoPaulo();
    const dataReferencia = quartaReferenciaSemanaSaoPaulo();

    const base = await listarBaseOperacionalGrupo(supabase, grupo);
    const lista = await avaliarElegibilidadeSemanaCafeConecta(supabase, base, semanaInicio, dataReferencia);
    const contagem = contagemMotivosElegibilidade(lista);

    const ciclo = await obterOuCriarCicloAtivo(supabase, grupo.slug);
    const cicloResumo = await montarResumoCiclo(supabase, grupo, ciclo.id, ciclo.numero);

    const publicado = await buscarSorteioSemana(supabase, grupo.slug, semanaInicio, 'publicado');
    let sorteioAtual = publicado;
    if (!sorteioAtual) {
      sorteioAtual = await buscarSorteioSemana(supabase, grupo.slug, semanaInicio, 'rascunho');
    }

    const historico = await listarHistoricoGrupo(supabase, grupo.slug);
    const duplas = await listarHistoricoDuplasGrupo(supabase, grupo.slug);
    const metricas = await metricasEngajamentoGrupo(supabase, grupo.slug, semanaInicio);

    return {
      ok: true,
      grupo: { slug: grupo.slug, label: grupo.label },
      semana_inicio: semanaInicio,
      data_referencia: dataReferencia,
      alerta_quinta: deveExibirAlertaCafeConectaQuinta(new Date(), !!publicado),
      elegibilidade: {
        total_base: base.length,
        ...contagem,
        lista,
      },
      sorteio_atual: sorteioAtual,
      ciclo: cicloResumo,
      historico,
      duplas,
      metricas,
      tabelas_ok: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (tabelaAusente(msg)) {
      return { ok: false, code: 'tabelas_ausentes', erro: msg };
    }
    throw e;
  }
}

async function removerRascunhoSemana(
  supabase: SupabaseClient,
  grupoSlug: string,
  semanaInicio: string
): Promise<void> {
  const { data: rascunhos } = await supabase
    .from('cafe_conecta_sorteios')
    .select('id')
    .eq('grupo_slug', grupoSlug)
    .eq('semana_inicio', semanaInicio)
    .eq('status', 'rascunho');

  const ids = (rascunhos ?? []).map((r) => String(r.id));
  if (ids.length === 0) return;
  await supabase.from('cafe_conecta_sorteios').delete().in('id', ids);
}

export async function realizarSorteioCafeConecta(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig
): Promise<{ ok: true; sorteio: CafeConectaSorteioRow } | { ok: false; erro: string }> {
  const semanaInicio = segundaSemanaSaoPaulo();
  const dataReferencia = quartaReferenciaSemanaSaoPaulo();

  const publicado = await buscarSorteioSemana(supabase, grupo.slug, semanaInicio, 'publicado');
  if (publicado) {
    return { ok: false, erro: 'Já existe sorteio publicado nesta semana.' };
  }

  const base = await listarBaseOperacionalGrupo(supabase, grupo);
  const lista = await avaliarElegibilidadeSemanaCafeConecta(supabase, base, semanaInicio, dataReferencia);
  const elegiveis = lista.filter((l) => l.elegivel);
  if (elegiveis.length < 2) {
    return { ok: false, erro: 'Menos de 2 colaboradores elegíveis para sortear.' };
  }

  const ciclo = await obterOuCriarCicloAtivo(supabase, grupo.slug);
  const idsNoCiclo = await idsParticiparamCiclo(supabase, ciclo.id);
  const baseIds = new Set(base.map((b) => b.id));
  const idsNuncaNoCiclo = new Set(Array.from(baseIds).filter((id) => !idsNoCiclo.has(id)));

  const { ciclo: partCiclo, total: partTotal, pares } = await mapParticipacoesHistorico(supabase, grupo.slug);
  const candidatos = prepararCandidatosSorteio(elegiveis, partCiclo, partTotal);
  const resultado = sortearDuplaCafeConecta({ candidatos, idsNuncaNoCiclo, paresHistorico: pares });
  if (!resultado) {
    return { ok: false, erro: 'Não foi possível formar dupla.' };
  }

  await removerRascunhoSemana(supabase, grupo.slug, semanaInicio);

  const observacao = resultado.mesma_area
    ? 'Dupla do mesmo setor/área (sem alternativa melhor nesta semana).'
    : resultado.excecao_ciclo_impar
      ? 'Exceção: último colaborador do ciclo pareado com repetição.'
      : null;

  const { data: sorteio, error: errS } = await supabase
    .from('cafe_conecta_sorteios')
    .insert({
      grupo_slug: grupo.slug,
      ciclo_id: ciclo.id,
      semana_inicio: semanaInicio,
      data_referencia: dataReferencia,
      status: 'rascunho',
      seed: resultado.seed,
      excecao_ciclo_impar: resultado.excecao_ciclo_impar,
      observacao_admin: observacao,
    })
    .select(
      'id, grupo_slug, ciclo_id, semana_inicio, data_referencia, status, seed, excecao_ciclo_impar, observacao_admin, publicado_por, publicado_em'
    )
    .single();

  if (errS) throw new Error(errS.message);

  const pessoas = [
    { sorteio_id: sorteio!.id, colaborador_id: resultado.a.id, ordem: 1, nome_snapshot: resultado.a.nome, setor_snapshot: resultado.a.setor, unidade_nome_snapshot: resultado.a.unidade_nome },
    { sorteio_id: sorteio!.id, colaborador_id: resultado.b.id, ordem: 2, nome_snapshot: resultado.b.nome, setor_snapshot: resultado.b.setor, unidade_nome_snapshot: resultado.b.unidade_nome },
  ];
  const { error: errP } = await supabase.from('cafe_conecta_sorteio_pessoas').insert(pessoas);
  if (errP) throw new Error(errP.message);

  const participantes = await carregarParticipantesSorteio(supabase, String(sorteio!.id));
  return {
    ok: true,
    sorteio: { ...(sorteio as CafeConectaSorteioRow), participantes },
  };
}

export async function publicarSorteioCafeConecta(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig,
  publicadoPorId: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const semanaInicio = segundaSemanaSaoPaulo();
  const rascunho = await buscarSorteioSemana(supabase, grupo.slug, semanaInicio, 'rascunho');
  if (!rascunho) {
    return { ok: false, erro: 'Nenhum rascunho para publicar. Realize o sorteio primeiro.' };
  }

  const { error } = await supabase
    .from('cafe_conecta_sorteios')
    .update({
      status: 'publicado',
      publicado_por: publicadoPorId,
      publicado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rascunho.id);

  if (error) throw new Error(error.message);

  const ciclo = await obterOuCriarCicloAtivo(supabase, grupo.slug);
  const base = await listarBaseOperacionalGrupo(supabase, grupo);
  const participaram = await idsParticiparamCiclo(supabase, ciclo.id);
  if (participaram.size >= base.length && base.length > 0) {
    await supabase
      .from('cafe_conecta_ciclos')
      .update({ encerrado_em: new Date().toISOString() })
      .eq('id', ciclo.id);
    await obterOuCriarCicloAtivo(supabase, grupo.slug);
  }

  return { ok: true };
}

export async function buscarSorteioPublicadoPortal(
  supabase: SupabaseClient,
  grupoSlug: string,
  semanaInicio?: string
): Promise<CafeConectaSorteioRow | null> {
  const sem = semanaInicio ?? segundaSemanaSaoPaulo();
  return buscarSorteioSemana(supabase, grupoSlug, sem, 'publicado');
}

export async function verificarAlertaCafeConectaAdmin(
  supabase: SupabaseClient,
  grupo: CafeConectaGrupoConfig
): Promise<boolean> {
  try {
    const semanaInicio = segundaSemanaSaoPaulo();
    const pub = await buscarSorteioSemana(supabase, grupo.slug, semanaInicio, 'publicado');
    return deveExibirAlertaCafeConectaQuinta(new Date(), !!pub);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (tabelaAusente(msg)) return false;
    throw e;
  }
}
