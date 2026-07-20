import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChecklistItemStatus,
  ChecklistRegistro,
  ChecklistRespostasPayload,
  ChecklistTurno,
  ChecklistTipo,
} from '@/lib/checklists/types';
import { templateChecklistPorTipo, todosIdsItens } from '@/lib/checklists/templates';
import {
  dataMinimaRetencaoChecklist,
  dataOperacionalSaoPaulo,
  diaSemanaDeDataIso,
  diaSemanaOperacionalSaoPaulo,
} from '@/lib/checklists/dia-semana';

export function contagemStatusItens(
  status: Record<string, ChecklistItemStatus | undefined>,
  ids: string[]
): { ok: number; pendente: number; respondidos: number; total: number } {
  let ok = 0;
  let pendente = 0;
  let respondidos = 0;
  for (const id of ids) {
    const s = status[id];
    if (s === 'ok') {
      ok += 1;
      respondidos += 1;
    } else if (s === 'pendente') {
      pendente += 1;
      respondidos += 1;
    }
  }
  return { ok, pendente, respondidos, total: ids.length };
}

export function normalizarRespostas(
  templateTipo: ChecklistTipo,
  bruto: unknown
): ChecklistRespostasPayload {
  const template = templateChecklistPorTipo(templateTipo);
  const ids = template ? new Set(todosIdsItens(template)) : new Set<string>();
  const src = bruto && typeof bruto === 'object' ? (bruto as Record<string, unknown>) : {};

  const statusSrc =
    src.status_itens && typeof src.status_itens === 'object'
      ? (src.status_itens as Record<string, unknown>)
      : {};
  const itensLegacy =
    src.itens && typeof src.itens === 'object' ? (src.itens as Record<string, unknown>) : {};
  const justSrc =
    src.justificativas_itens && typeof src.justificativas_itens === 'object'
      ? (src.justificativas_itens as Record<string, unknown>)
      : {};

  const status_itens: Record<string, ChecklistItemStatus> = {};
  const justificativas_itens: Record<string, string> = {};

  for (const id of Array.from(ids)) {
    const st = statusSrc[id];
    if (st === 'ok' || st === 'pendente') {
      status_itens[id] = st;
    } else if (itensLegacy[id] === true) {
      status_itens[id] = 'ok';
    }
    const just = justSrc[id];
    if (typeof just === 'string' && just.trim()) {
      justificativas_itens[id] = just.trim();
    }
  }

  const notas_secoes: Record<string, string> = {};
  if (src.notas_secoes && typeof src.notas_secoes === 'object') {
    for (const [k, v] of Object.entries(src.notas_secoes as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) notas_secoes[k] = v.trim();
    }
  }

  const out: ChecklistRespostasPayload = { status_itens, justificativas_itens, notas_secoes };
  if (typeof src.setor === 'string' && src.setor.trim()) out.setor = src.setor.trim();
  if (typeof src.temperatura_geladeira === 'string' && src.temperatura_geladeira.trim()) {
    out.temperatura_geladeira = src.temperatura_geladeira.trim();
  }
  if (typeof src.responsavel_abertura === 'string' && src.responsavel_abertura.trim()) {
    out.responsavel_abertura = src.responsavel_abertura.trim();
  }
  if (typeof src.responsavel_fechamento === 'string' && src.responsavel_fechamento.trim()) {
    out.responsavel_fechamento = src.responsavel_fechamento.trim();
  }
  return out;
}

export function validarRespostasChecklist(respostas: ChecklistRespostasPayload): string | null {
  for (const [id, st] of Object.entries(respostas.status_itens)) {
    if (st !== 'pendente') continue;
    const just = respostas.justificativas_itens?.[id]?.trim() ?? '';
    if (just.length < 3) {
      return 'Todo item marcado como pendente precisa de uma justificativa (mínimo 3 caracteres).';
    }
  }
  return null;
}

type RowDb = {
  id: string;
  unidade_id: string;
  tipo: string;
  turno: string;
  data_referencia?: string | null;
  dia_semana: number;
  colaborador_id: string;
  respostas: unknown;
  observacoes: string | null;
  preenchido_em: string;
  updated_at: string;
  publicado_em?: string | null;
  publicado_por_id?: string | null;
  unidades?: { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
  colaboradores?: { nome?: string } | { nome?: string }[] | null;
};

const SELECT_BASE =
  'id, unidade_id, tipo, turno, data_referencia, dia_semana, colaborador_id, respostas, observacoes, preenchido_em, updated_at, publicado_em, publicado_por_id, unidades(nome, slug), colaboradores!colaborador_id(nome)';

const SELECT_SEM_DATA =
  'id, unidade_id, tipo, turno, dia_semana, colaborador_id, respostas, observacoes, preenchido_em, updated_at, publicado_em, publicado_por_id, unidades(nome, slug), colaboradores!colaborador_id(nome)';

const SELECT_LEGADO =
  'id, unidade_id, tipo, turno, dia_semana, colaborador_id, respostas, observacoes, preenchido_em, updated_at, unidades(nome, slug), colaboradores!colaborador_id(nome)';

function erroColunaDataReferencia(msg: string | null | undefined): boolean {
  return !!msg && /data_referencia/i.test(msg) && /does not exist|schema cache|could not find/i.test(msg);
}

function mapRow(row: RowDb, publicadoPorNome?: string): ChecklistRegistro {
  const u = row.unidades;
  const unidade = Array.isArray(u) ? u[0] : u;
  const c = row.colaboradores;
  const colab = Array.isArray(c) ? c[0] : c;
  const dataRef = row.data_referencia ? String(row.data_referencia).slice(0, 10) : undefined;
  return {
    id: row.id,
    unidade_id: row.unidade_id,
    unidade_nome: unidade?.nome ? String(unidade.nome) : undefined,
    unidade_slug: unidade?.slug ? String(unidade.slug) : undefined,
    tipo: row.tipo as ChecklistTipo,
    turno: row.turno as ChecklistTurno,
    data_referencia: dataRef,
    dia_semana: Number(row.dia_semana),
    colaborador_id: row.colaborador_id,
    colaborador_nome: colab?.nome ? String(colab.nome) : undefined,
    respostas: normalizarRespostas(row.tipo as ChecklistTipo, row.respostas),
    observacoes: row.observacoes,
    preenchido_em: String(row.preenchido_em),
    updated_at: String(row.updated_at),
    publicado_em: row.publicado_em ? String(row.publicado_em) : null,
    publicado_por_id: row.publicado_por_id ? String(row.publicado_por_id) : null,
    publicado_por_nome: publicadoPorNome,
  };
}

async function nomeColaborador(supabase: SupabaseClient, id: string | null | undefined): Promise<string | undefined> {
  if (!id) return undefined;
  const { data } = await supabase.from('colaboradores').select('nome').eq('id', id).maybeSingle();
  return data?.nome ? String(data.nome) : undefined;
}

export async function buscarChecklistSlot(
  supabase: SupabaseClient,
  opts: {
    unidadeId: string;
    tipo: ChecklistTipo;
    turno: ChecklistTurno;
    /** Preferir data civil; se omitida, usa hoje (SP). */
    dataReferencia?: string;
    /** Legado (pré-071): fallback por dia da semana. */
    diaSemana?: number;
  }
): Promise<ChecklistRegistro | null> {
  const dataRef = opts.dataReferencia?.trim() || dataOperacionalSaoPaulo();
  const diaSemana = opts.diaSemana ?? diaSemanaDeDataIso(dataRef);

  let data: RowDb | null = null;
  let error: { message: string } | null = null;

  const q1 = await supabase
    .from('checklists_operacionais')
    .select(SELECT_BASE)
    .eq('unidade_id', opts.unidadeId)
    .eq('tipo', opts.tipo)
    .eq('turno', opts.turno)
    .eq('data_referencia', dataRef)
    .maybeSingle();

  data = q1.data as RowDb | null;
  error = q1.error;

  if (error && erroColunaDataReferencia(error.message)) {
    const qLegacy = await supabase
      .from('checklists_operacionais')
      .select(SELECT_SEM_DATA)
      .eq('unidade_id', opts.unidadeId)
      .eq('tipo', opts.tipo)
      .eq('turno', opts.turno)
      .eq('dia_semana', diaSemana)
      .maybeSingle();
    data = qLegacy.data as RowDb | null;
    error = qLegacy.error;
  }

  if (error?.message.includes('publicado_em')) {
    const q2 = await supabase
      .from('checklists_operacionais')
      .select(SELECT_LEGADO)
      .eq('unidade_id', opts.unidadeId)
      .eq('tipo', opts.tipo)
      .eq('turno', opts.turno)
      .eq('dia_semana', diaSemana)
      .maybeSingle();
    data = q2.data as RowDb | null;
    error = q2.error;
  }

  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const pubNome = await nomeColaborador(supabase, data.publicado_por_id);
  return mapRow(data, pubNome);
}

/** Apaga checklists com mais de 7 dias (o 8º dia faz o 1º sair). */
export async function podarChecklistsAntigos(
  supabase: SupabaseClient,
  opts: { unidadeId: string; tipo: ChecklistTipo }
): Promise<void> {
  const minimo = dataMinimaRetencaoChecklist();
  const { error } = await supabase
    .from('checklists_operacionais')
    .delete()
    .eq('unidade_id', opts.unidadeId)
    .eq('tipo', opts.tipo)
    .lt('data_referencia', minimo);
  if (error && !erroColunaDataReferencia(error.message)) {
    throw new Error(error.message);
  }
}

export async function salvarChecklistSlot(
  supabase: SupabaseClient,
  opts: {
    unidadeId: string;
    tipo: ChecklistTipo;
    turno: ChecklistTurno;
    colaboradorId: string;
    respostas: ChecklistRespostasPayload;
    observacoes: string | null;
    dataReferencia?: string;
    diaSemana?: number;
    /** Mescla com registro existente (ex.: resolver pendência do outro turno). */
    mesclarComExistente?: boolean;
  }
): Promise<ChecklistRegistro> {
  const agora = new Date().toISOString();
  const dataRef = opts.dataReferencia?.trim() || dataOperacionalSaoPaulo();
  const diaSemana = opts.diaSemana ?? diaSemanaDeDataIso(dataRef);

  const existente = await buscarChecklistSlot(supabase, {
    unidadeId: opts.unidadeId,
    tipo: opts.tipo,
    turno: opts.turno,
    dataReferencia: dataRef,
    diaSemana,
  });

  let respostas = opts.respostas;
  if (opts.mesclarComExistente && existente) {
    const { mesclarRespostasChecklist } = await import('@/lib/checklists/publicacao');
    respostas = mesclarRespostasChecklist(existente.respostas, opts.respostas);
  }

  const payload: Record<string, unknown> = {
    unidade_id: opts.unidadeId,
    tipo: opts.tipo,
    turno: opts.turno,
    data_referencia: dataRef,
    dia_semana: diaSemana,
    colaborador_id: opts.colaboradorId,
    respostas,
    observacoes: opts.observacoes,
    updated_at: agora,
  };
  if (!existente) {
    payload.preenchido_em = agora;
  }
  // Novo dia = novo preenchimento; republicar o mesmo dia limpa o “publicado” até Publicar de novo.
  if (existente?.data_referencia === dataRef && existente.publicado_em) {
    // Mantém publicado_em até republicar explicitamente (publicarChecklistSlot atualiza).
  }

  let data: RowDb | null = null;
  let error: { message: string } | null = null;

  const up1 = await supabase
    .from('checklists_operacionais')
    .upsert(payload, { onConflict: 'unidade_id,tipo,turno,data_referencia' })
    .select(SELECT_BASE)
    .single();
  data = up1.data as RowDb | null;
  error = up1.error;

  if (error && erroColunaDataReferencia(error.message)) {
    const payloadLegado = { ...payload };
    delete payloadLegado.data_referencia;
    const up2 = await supabase
      .from('checklists_operacionais')
      .upsert(payloadLegado, { onConflict: 'unidade_id,tipo,turno,dia_semana' })
      .select(SELECT_SEM_DATA)
      .single();
    data = up2.data as RowDb | null;
    error = up2.error;
  }

  if (error?.message.includes('publicado_em')) {
    const payloadLegado = { ...payload };
    delete payloadLegado.data_referencia;
    delete payloadLegado.publicado_em;
    delete payloadLegado.publicado_por_id;
    const { data: d2, error: e2 } = await supabase
      .from('checklists_operacionais')
      .upsert(payloadLegado, { onConflict: 'unidade_id,tipo,turno,dia_semana' })
      .select(SELECT_LEGADO)
      .single();
    if (e2) throw new Error(e2.message);
    await podarChecklistsAntigos(supabase, { unidadeId: opts.unidadeId, tipo: opts.tipo });
    return mapRow(d2 as RowDb);
  }

  if (error) {
    if (/on conflict|unique/i.test(error.message) && /data_referencia/i.test(error.message)) {
      throw new Error('Migration 071 pendente: execute npm run db:apply-071 no portal.');
    }
    throw new Error(error.message);
  }

  await podarChecklistsAntigos(supabase, { unidadeId: opts.unidadeId, tipo: opts.tipo });
  const pubNome = await nomeColaborador(supabase, (data as RowDb).publicado_por_id);
  return mapRow(data as RowDb, pubNome);
}

export async function publicarChecklistSlot(
  supabase: SupabaseClient,
  opts: {
    unidadeId: string;
    tipo: ChecklistTipo;
    turno: ChecklistTurno;
    colaboradorId: string;
    respostas: ChecklistRespostasPayload;
    observacoes: string | null;
    dataReferencia?: string;
    diaSemana?: number;
    mesclarComExistente?: boolean;
  }
): Promise<ChecklistRegistro> {
  const agora = new Date().toISOString();
  const registro = await salvarChecklistSlot(supabase, {
    ...opts,
    mesclarComExistente: opts.mesclarComExistente ?? true,
  });

  const sel = SELECT_BASE;
  const { data, error } = await supabase
    .from('checklists_operacionais')
    .update({
      publicado_em: agora,
      publicado_por_id: opts.colaboradorId,
      updated_at: agora,
    })
    .eq('id', registro.id)
    .select(sel)
    .single();

  if (error?.message.includes('publicado_em')) {
    throw new Error('Migration 070 pendente: execute npm run db:apply-070 no portal.');
  }
  if (error && erroColunaDataReferencia(error.message)) {
    const r2 = await supabase
      .from('checklists_operacionais')
      .update({
        publicado_em: agora,
        publicado_por_id: opts.colaboradorId,
        updated_at: agora,
      })
      .eq('id', registro.id)
      .select(SELECT_SEM_DATA)
      .single();
    if (r2.error) throw new Error(r2.error.message);
    const pubNome = await nomeColaborador(supabase, opts.colaboradorId);
    return mapRow(r2.data as RowDb, pubNome);
  }
  if (error) throw new Error(error.message);

  const pubNome = await nomeColaborador(supabase, opts.colaboradorId);
  return mapRow(data as RowDb, pubNome);
}

export async function listarChecklistsSemana(
  supabase: SupabaseClient,
  opts: { unidadeId?: string | null; tipo?: string | null }
): Promise<ChecklistRegistro[]> {
  const minimo = dataMinimaRetencaoChecklist();
  let q = supabase
    .from('checklists_operacionais')
    .select(SELECT_BASE)
    .gte('data_referencia', minimo)
    .order('data_referencia', { ascending: false })
    .order('tipo', { ascending: true })
    .order('turno', { ascending: true });

  if (opts.unidadeId) q = q.eq('unidade_id', opts.unidadeId);
  if (opts.tipo) q = q.eq('tipo', opts.tipo);

  const { data, error } = await q;
  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) return [];
    if (erroColunaDataReferencia(error.message) || error.message.includes('publicado_em')) {
      let q2 = supabase
        .from('checklists_operacionais')
        .select(error.message.includes('publicado_em') ? SELECT_LEGADO : SELECT_SEM_DATA)
        .order('dia_semana', { ascending: true })
        .order('tipo', { ascending: true })
        .order('turno', { ascending: true });
      if (opts.unidadeId) q2 = q2.eq('unidade_id', opts.unidadeId);
      if (opts.tipo) q2 = q2.eq('tipo', opts.tipo);
      const r2 = await q2;
      if (r2.error) throw new Error(r2.error.message);
      return ((r2.data ?? []) as unknown as RowDb[]).map((row) => mapRow(row));
    }
    throw new Error(error.message);
  }
  const rows = await Promise.all(
    ((data ?? []) as unknown as RowDb[]).map(async (row) => {
      const pubNome = await nomeColaborador(supabase, row.publicado_por_id);
      return mapRow(row, pubNome);
    })
  );
  return rows;
}

/** Reexport para callers que montam o dia corrente. */
export { dataOperacionalSaoPaulo, diaSemanaOperacionalSaoPaulo };
