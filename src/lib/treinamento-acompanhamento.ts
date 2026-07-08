import type { createAdminClient } from '@/lib/supabase/admin';
import {
  labelPublicoAviso,
  resolverPublicoAviso,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';
import {
  montarAudienciaTreinamento,
  type PessoaAudiencia,
  type ResumoAudienciaComunicacao,
} from '@/lib/audiencia-comunicacao';
import { resolverParTreinosQuinta } from '@/lib/graos/quinta-treino';
import { inicioCicloTreinoQuintaIsoSp, inicioCicloTreinoQuintaUtcIsoSp, rotuloCicloTreinoQuinta } from '@/lib/semana-brasil';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { deveVerTreinoLiderancaPortal, normalizePortalRole } from '@/lib/roles';
import { treinoLiderVideoIdAtual } from '@/lib/treino-lider-acompanhamento';
import { normalizarTipoConteudo } from '@/lib/treinamento-conteudo';
import {
  haTreinoTextoLiderancaVigente,
  rotuloSemanaTreino,
  treinamentoTextoArquivado,
  type TreinamentoDbRow,
} from '@/lib/treinamento-vigencia';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type ItemAcompanhamentoTreinamento = {
  id: string;
  titulo: string;
  origem: 'cadastro' | 'automatico';
  formato: 'video' | 'texto';
  publico_label: string;
  publico_alvo: PublicoAvisoKey | 'colaboradores' | 'lideranca';
  exige_confirmacao: boolean;
  total_esperado: number;
  vigente: boolean;
  semana_rotulo: string;
  created_at?: string | null;
  /** Ciclo da quinta: desde qual data contamos conclusões (só treinos automáticos). */
  ciclo_desde?: string | null;
  assistiram: PessoaAudiencia[];
  nao_assistiram: PessoaAudiencia[];
  visualizou_sem_confirmar: PessoaAudiencia[];
};

/** Resumo leve (sem listas de nomes) para carregar sob demanda. */
export type ItemAcompanhamentoResumo = {
  id: string;
  titulo: string;
  origem: 'cadastro' | 'automatico';
  formato: 'video' | 'texto';
  publico_label: string;
  publico_alvo: PublicoAvisoKey | 'colaboradores' | 'lideranca';
  exige_confirmacao: boolean;
  total_esperado: number;
  vigente: boolean;
  semana_rotulo: string;
  concluiram: number;
  nao_fizeram: number;
  visualizou_sem_confirmar: number;
};

export function itemAcompanhamentoParaResumo(item: ItemAcompanhamentoTreinamento): ItemAcompanhamentoResumo {
  return {
    id: item.id,
    titulo: item.titulo,
    origem: item.origem,
    formato: item.formato,
    publico_label: item.publico_label,
    publico_alvo: item.publico_alvo,
    exige_confirmacao: item.exige_confirmacao,
    total_esperado: item.total_esperado,
    vigente: item.vigente,
    semana_rotulo: item.semana_rotulo,
    concluiram: item.assistiram.length,
    nao_fizeram: item.nao_assistiram.length,
    visualizou_sem_confirmar: item.visualizou_sem_confirmar.length,
  };
}

function classificarListas(
  resumo: ResumoAudienciaComunicacao,
  exige_confirmacao: boolean
): Pick<ItemAcompanhamentoTreinamento, 'assistiram' | 'nao_assistiram' | 'visualizou_sem_confirmar'> {
  if (exige_confirmacao) {
    return {
      assistiram: resumo.confirmados,
      visualizou_sem_confirmar: resumo.abriu_nao_confirmou,
      nao_assistiram: resumo.nao_fez,
    };
  }
  return {
    assistiram: [...resumo.confirmados, ...resumo.abriu_nao_confirmou],
    visualizou_sem_confirmar: [],
    nao_assistiram: resumo.nao_fez,
  };
}

type ColabBase = PessoaAudiencia & {
  role: string;
};

async function listarColaboradoresBase(supabase: SupabaseAdmin): Promise<ColabBase[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, setor, role, unidades(nome, slug)')
    .order('nome');

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => {
    const un = c.unidades as { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
    const u = Array.isArray(un) ? un[0] : un;
    return {
      id: String(c.id),
      nome: String(c.nome ?? ''),
      setor: (c.setor as string | null) ?? null,
      unidade_nome: u?.nome ? String(u.nome) : null,
      visualizado_em: null,
      confirmado_em: null,
      role: normalizePortalRole(c.role as string | null),
    };
  });
}

async function videoJaExistiaAntesDoCiclo(
  supabase: SupabaseAdmin,
  tabela: 'treino_lider_conclusoes' | 'treinamento_automatico_registros',
  filtro: { coluna: string; valor: string },
  cicloUtc: string
): Promise<boolean> {
  const colData = tabela === 'treino_lider_conclusoes' ? 'concluido_em' : 'visualizado_em';
  const { data, error } = await supabase
    .from(tabela)
    .select('id')
    .eq(filtro.coluna, filtro.valor)
    .lt(colData, cicloUtc)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

async function montarAudienciaTreinoLider(supabase: SupabaseAdmin): Promise<ItemAcompanhamentoTreinamento | null> {
  const videoId = treinoLiderVideoIdAtual();
  const par = resolverParTreinosQuinta(undefined);
  if (!videoId || !par.lider.embed_url) return null;

  const cicloInicio = inicioCicloTreinoQuintaIsoSp();
  const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();

  const base = await listarColaboradoresBase(supabase);
  const esperados: ColabBase[] = [];

  for (const p of base) {
    const podeAvaliacao = await podeUsarAvaliacaoEquipeSemanal(supabase, p.id, p.role);
    if (deveVerTreinoLiderancaPortal(p.role, podeAvaliacao)) {
      esperados.push(p);
    }
  }

  const ids = esperados.map((p) => p.id);
  const confMap = new Map<string, string>();

  const videoReutilizado = await videoJaExistiaAntesDoCiclo(
    supabase, 'treino_lider_conclusoes',
    { coluna: 'video_youtube_id', valor: videoId }, cicloUtc
  );

  if (ids.length > 0 && !videoReutilizado) {
    const { data: conf } = await supabase
      .from('treino_lider_conclusoes')
      .select('colaborador_id, concluido_em')
      .eq('video_youtube_id', videoId)
      .gte('concluido_em', cicloUtc)
      .in('colaborador_id', ids);

    for (const row of conf ?? []) {
      confMap.set(String(row.colaborador_id), String(row.concluido_em ?? ''));
    }
  }

  const confirmados: PessoaAudiencia[] = [];
  const nao_fez: PessoaAudiencia[] = [];

  for (const p of esperados) {
    const confirmado_em = confMap.get(p.id) ?? null;
    const row = { ...p, visualizado_em: confirmado_em, confirmado_em };
    if (confirmado_em) confirmados.push(row);
    else nao_fez.push(row);
  }

  const byNome = (a: PessoaAudiencia, b: PessoaAudiencia) => a.nome.localeCompare(b.nome, 'pt-BR');
  confirmados.sort(byNome);
  nao_fez.sort(byNome);

  const resumo: ResumoAudienciaComunicacao = {
    total_esperado: esperados.length,
    confirmados,
    abriu_nao_confirmou: [],
    nao_fez,
  };

  return {
    id: 'quinta-lider',
    titulo: par.lider.titulo,
    origem: 'automatico',
    formato: 'video',
    publico_label: 'Liderança',
    publico_alvo: 'lideranca',
    exige_confirmacao: true,
    vigente: true,
    semana_rotulo: rotuloCicloTreinoQuinta(cicloInicio),
    ciclo_desde: cicloInicio,
    total_esperado: resumo.total_esperado,
    ...classificarListas(resumo, true),
  };
}

export function chaveTreinoAutomaticoColaborador(videoId: string): string {
  return `quinta-colaborador:${videoId}`;
}

async function montarAudienciaTreinoColaboradorQuinta(
  supabase: SupabaseAdmin
): Promise<ItemAcompanhamentoTreinamento | null> {
  const par = resolverParTreinosQuinta(undefined);
  const videoId = par.colaborador.youtube_video_id;
  if (!videoId || !par.colaborador.embed_url) return null;

  const cicloInicio = inicioCicloTreinoQuintaIsoSp();
  const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();
  const chave = chaveTreinoAutomaticoColaborador(videoId);
  const base = await listarColaboradoresBase(supabase);
  const esperados = base.filter((p) => normalizePortalRole(p.role) === 'colaborador');
  const ids = esperados.map((p) => p.id);

  const visualMap = new Map<string, string>();
  const confMap = new Map<string, string>();

  const videoReutilizado = await videoJaExistiaAntesDoCiclo(
    supabase, 'treinamento_automatico_registros',
    { coluna: 'treino_chave', valor: chave }, cicloUtc
  );

  if (ids.length > 0 && !videoReutilizado) {
    const { data: graosRows, error: graosErr } = await supabase
      .from('graos_quinta_conclusoes')
      .select('colaborador_id, data_quinta, created_at')
      .gte('data_quinta', cicloInicio)
      .in('colaborador_id', ids);

    if (!graosErr) {
      for (const row of graosRows ?? []) {
        const cid = String(row.colaborador_id);
        const quando = String(row.created_at ?? row.data_quinta ?? '');
        if (quando) {
          visualMap.set(cid, quando);
          confMap.set(cid, quando);
        }
      }
    }

    const { data: rows, error: autoErr } = await supabase
      .from('treinamento_automatico_registros')
      .select('colaborador_id, visualizado_em, confirmado_em')
      .eq('treino_chave', chave)
      .in('colaborador_id', ids);

    if (!autoErr) {
      for (const row of rows ?? []) {
        const cid = String(row.colaborador_id);
        const vis = row.visualizado_em ? String(row.visualizado_em) : '';
        const conf = row.confirmado_em ? String(row.confirmado_em) : '';
        if (vis && vis >= cicloUtc) visualMap.set(cid, vis);
        if (conf && conf >= cicloUtc) confMap.set(cid, conf);
        if (vis && vis >= cicloUtc && !confMap.has(cid)) confMap.set(cid, vis);
      }
    }
  }

  const confirmados: PessoaAudiencia[] = [];
  const abriu_nao_confirmou: PessoaAudiencia[] = [];
  const nao_fez: PessoaAudiencia[] = [];

  for (const p of esperados) {
    const visualizado_em = visualMap.get(p.id) ?? null;
    const confirmado_em = confMap.get(p.id) ?? null;
    const row = { ...p, visualizado_em, confirmado_em };
    if (confirmado_em || visualizado_em) confirmados.push(row);
    else nao_fez.push(row);
  }

  const byNome = (a: PessoaAudiencia, b: PessoaAudiencia) => a.nome.localeCompare(b.nome, 'pt-BR');
  confirmados.sort(byNome);
  abriu_nao_confirmou.sort(byNome);
  nao_fez.sort(byNome);

  const resumo: ResumoAudienciaComunicacao = {
    total_esperado: esperados.length,
    confirmados,
    abriu_nao_confirmou,
    nao_fez,
  };

  return {
    id: 'quinta-colaborador',
    titulo: par.colaborador.titulo,
    origem: 'automatico',
    formato: 'video',
    publico_label: 'Colaboradores',
    publico_alvo: 'colaboradores',
    exige_confirmacao: false,
    vigente: true,
    semana_rotulo: rotuloCicloTreinoQuinta(cicloInicio),
    ciclo_desde: cicloInicio,
    total_esperado: resumo.total_esperado,
    ...classificarListas(resumo, false),
  };
}

export async function migration064TreinamentoPendente(supabase: SupabaseAdmin): Promise<boolean> {
  const { error } = await supabase.from('treinamento_automatico_registros').select('treino_chave').limit(1);
  return Boolean(error && /treinamento_automatico_registros|does not exist|schema cache/i.test(error.message));
}

export type AcompanhamentoTreinamentosResultado = {
  itens: ItemAcompanhamentoTreinamento[];
  vigentes: ItemAcompanhamentoTreinamento[];
  anteriores: ItemAcompanhamentoTreinamento[];
  ciclo_quinta_inicio: string;
  ciclo_quinta_rotulo: string;
};

export async function montarAcompanhamentoTreinamentos(
  supabase: SupabaseAdmin,
  opts?: { escopo?: 'vigentes' | 'anteriores' | 'todos' }
): Promise<AcompanhamentoTreinamentosResultado> {
  const escopo = opts?.escopo ?? 'todos';
  const ciclo_quinta_inicio = inicioCicloTreinoQuintaIsoSp();
  const ciclo_quinta_rotulo = rotuloCicloTreinoQuinta(ciclo_quinta_inicio);
  const itens: ItemAcompanhamentoTreinamento[] = [];

  const queryFull = await supabase
    .from('treinamentos')
    .select('id, titulo, tipo_conteudo, publico_alvo, exige_confirmacao, created_at, unidades:unidade_id(slug)')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false });

  const query =
    queryFull.error && /tipo_conteudo|created_at|schema cache/i.test(queryFull.error.message)
      ? await supabase
          .from('treinamentos')
          .select('id, titulo, publico_alvo, exige_confirmacao, unidades:unidade_id(slug)')
          .eq('ativo', true)
          .order('ordem', { ascending: true })
          .order('created_at', { ascending: false })
      : queryFull;

  const rowsDb: TreinamentoDbRow[] = [];

  if (!query.error) {
    const rows = (query.data ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      rowsDb.push({
        id: String(row.id),
        titulo: String(row.titulo ?? ''),
        publico_alvo: (row.publico_alvo as string | null) ?? null,
        tipo_conteudo: (row as { tipo_conteudo?: string }).tipo_conteudo ?? null,
        created_at: String(row.created_at ?? ''),
        ativo: true,
      });
    }

    for (const row of rows) {
      const id = String(row.id);
      const unidade = row.unidades as { slug?: string } | null;
      const publico = resolverPublicoAviso(row.publico_alvo as string | null, unidade?.slug ?? null);
      const tipo = normalizarTipoConteudo((row as { tipo_conteudo?: string }).tipo_conteudo);
      const created_at = (row.created_at as string | null) ?? null;
      const dbRow: TreinamentoDbRow = {
        id,
        titulo: String(row.titulo ?? ''),
        publico_alvo: (row.publico_alvo as string | null) ?? null,
        tipo_conteudo: (row as { tipo_conteudo?: string }).tipo_conteudo ?? null,
        created_at: String(created_at ?? ''),
        ativo: true,
      };
      const arquivado = treinamentoTextoArquivado(dbRow, rowsDb);
      if (escopo === 'vigentes' && arquivado) continue;
      if (escopo === 'anteriores' && !arquivado) continue;

      const audiencia = await montarAudienciaTreinamento(supabase, id);

      itens.push({
        id,
        titulo: String(row.titulo ?? audiencia.titulo),
        origem: 'cadastro',
        formato: tipo,
        publico_label: labelPublicoAviso(publico as PublicoAvisoKey),
        publico_alvo: publico as PublicoAvisoKey,
        exige_confirmacao: audiencia.exige_confirmacao,
        vigente: !arquivado,
        semana_rotulo: rotuloSemanaTreino(created_at),
        created_at,
        total_esperado: audiencia.total_esperado,
        ...classificarListas(audiencia, audiencia.exige_confirmacao),
      });
    }
  }

  if (escopo !== 'anteriores') {
    const quintaColab = await montarAudienciaTreinoColaboradorQuinta(supabase);
    if (quintaColab) itens.push(quintaColab);

    if (!haTreinoTextoLiderancaVigente(rowsDb)) {
      const quintaLider = await montarAudienciaTreinoLider(supabase);
      if (quintaLider) itens.push(quintaLider);
    }
  }

  const vigentes = itens.filter((i) => i.vigente);
  const anteriores = itens.filter((i) => !i.vigente);

  return { itens, vigentes, anteriores, ciclo_quinta_inicio, ciclo_quinta_rotulo };
}

export async function montarAcompanhamentoResumo(
  supabase: SupabaseAdmin,
  escopo: 'vigentes' | 'anteriores'
): Promise<{ itens: ItemAcompanhamentoResumo[]; ciclo_quinta_inicio: string; ciclo_quinta_rotulo: string }> {
  const full = await montarAcompanhamentoTreinamentos(supabase, { escopo });
  const lista = escopo === 'vigentes' ? full.vigentes : full.anteriores;
  return {
    itens: lista.map(itemAcompanhamentoParaResumo),
    ciclo_quinta_inicio: full.ciclo_quinta_inicio,
    ciclo_quinta_rotulo: full.ciclo_quinta_rotulo,
  };
}

export async function montarDetalheAcompanhamentoItem(
  supabase: SupabaseAdmin,
  itemId: string
): Promise<ItemAcompanhamentoTreinamento | null> {
  if (itemId === 'quinta-colaborador') {
    return montarAudienciaTreinoColaboradorQuinta(supabase);
  }
  if (itemId === 'quinta-lider') {
    return montarAudienciaTreinoLider(supabase);
  }

  const { data: row, error } = await supabase
    .from('treinamentos')
    .select('id, titulo, tipo_conteudo, publico_alvo, exige_confirmacao, created_at, unidades:unidade_id(slug)')
    .eq('id', itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const audiencia = await montarAudienciaTreinamento(supabase, itemId);
  const unidade = row.unidades as { slug?: string } | null;
  const publico = resolverPublicoAviso(row.publico_alvo as string | null, unidade?.slug ?? null);
  const tipo = normalizarTipoConteudo((row as { tipo_conteudo?: string }).tipo_conteudo);
  const created_at = (row.created_at as string | null) ?? null;

  const { data: todosAtivos } = await supabase
    .from('treinamentos')
    .select('id, titulo, tipo_conteudo, publico_alvo, created_at')
    .eq('ativo', true);

  const rowsDb: TreinamentoDbRow[] = (todosAtivos ?? []).map((r) => ({
    id: String(r.id),
    titulo: String(r.titulo ?? ''),
    publico_alvo: (r.publico_alvo as string | null) ?? null,
    tipo_conteudo: (r as { tipo_conteudo?: string }).tipo_conteudo ?? null,
    created_at: String(r.created_at ?? ''),
    ativo: true,
  }));

  const dbRow: TreinamentoDbRow = {
    id: itemId,
    titulo: String(row.titulo ?? ''),
    publico_alvo: (row.publico_alvo as string | null) ?? null,
    tipo_conteudo: (row as { tipo_conteudo?: string }).tipo_conteudo ?? null,
    created_at: String(created_at ?? ''),
    ativo: true,
  };
  const arquivado = treinamentoTextoArquivado(dbRow, rowsDb);

  return {
    id: itemId,
    titulo: String(row.titulo ?? audiencia.titulo),
    origem: 'cadastro',
    formato: tipo,
    publico_label: labelPublicoAviso(publico as PublicoAvisoKey),
    publico_alvo: publico as PublicoAvisoKey,
    exige_confirmacao: audiencia.exige_confirmacao,
    vigente: !arquivado,
    semana_rotulo: rotuloSemanaTreino(created_at),
    created_at,
    total_esperado: audiencia.total_esperado,
    ...classificarListas(audiencia, audiencia.exige_confirmacao),
  };
}

export async function registrarVisualizacaoTreinoAutomatico(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  treinoChave: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const agora = new Date().toISOString();
  const { error } = await supabase.from('treinamento_automatico_registros').upsert(
    {
      treino_chave: treinoChave,
      colaborador_id: colaboradorId,
      visualizado_em: agora,
    },
    { onConflict: 'treino_chave,colaborador_id' }
  );

  if (error) {
    if (/treinamento_automatico_registros|does not exist|schema cache/i.test(error.message)) {
      return { ok: false, erro: 'Tabela de acompanhamento ainda não existe — aplique a migration 064.' };
    }
    return { ok: false, erro: error.message };
  }

  return { ok: true };
}
