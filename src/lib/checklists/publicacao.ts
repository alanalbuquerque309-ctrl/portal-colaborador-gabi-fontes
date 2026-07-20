import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChecklistItemStatus,
  ChecklistRegistro,
  ChecklistRespostasPayload,
  ChecklistTemplate,
  ChecklistTurno,
  ChecklistTipo,
} from '@/lib/checklists/types';
import { templateChecklistPorTipo, todosIdsItensTurno, turnoDoItem } from '@/lib/checklists/templates';
import { normalizarRespostas, contagemStatusItens, buscarChecklistSlot } from '@/lib/checklists/service';
import {
  dataMinimaRetencaoChecklist,
  dataOperacionalSaoPaulo,
  diaSemanaDeDataIso,
  diaSemanaOperacionalSaoPaulo,
} from '@/lib/checklists/dia-semana';

export type PendenciaOutroTurno = {
  id: string;
  label: string;
  horario?: string;
  turno_origem: ChecklistTurno;
  status: ChecklistItemStatus;
  justificativa: string;
};

export type ChecklistExibicaoPublicada = {
  unidade_id: string;
  tipo: ChecklistTipo;
  data_referencia: string;
  dia_semana: number;
  /** true = publicação de hoje; false = último dia publicado (ainda na janela de 7 dias). */
  eh_hoje: boolean;
  registros: ChecklistRegistro[];
  respostas: ChecklistRespostasPayload;
  publicado_em: string;
  publicado_por_nome?: string;
  ok: number;
  pendente: number;
  total: number;
};

export type ChecklistHistoricoDia = {
  data_referencia: string;
  dia_semana: number;
  publicado_em: string;
  publicado_por_nome?: string;
  ok: number;
  pendente: number;
  total: number;
  eh_hoje: boolean;
  respostas: ChecklistRespostasPayload;
};

export function outroTurno(turno: ChecklistTurno): ChecklistTurno {
  return turno === 'manha' ? 'tarde' : 'manha';
}

export function mesclarRespostasChecklist(
  ...partes: ChecklistRespostasPayload[]
): ChecklistRespostasPayload {
  const status_itens: Record<string, ChecklistItemStatus> = {};
  const justificativas_itens: Record<string, string> = {};
  const notas_secoes: Record<string, string> = {};
  let extras: Partial<ChecklistRespostasPayload> = {};

  for (const p of partes) {
    Object.assign(status_itens, p.status_itens);
    if (p.justificativas_itens) {
      for (const [k, v] of Object.entries(p.justificativas_itens)) {
        if (v?.trim()) justificativas_itens[k] = v.trim();
        else delete justificativas_itens[k];
      }
    }
    if (p.notas_secoes) Object.assign(notas_secoes, p.notas_secoes);
    if (p.setor) extras.setor = p.setor;
    if (p.temperatura_geladeira) extras.temperatura_geladeira = p.temperatura_geladeira;
    if (p.responsavel_abertura) extras.responsavel_abertura = p.responsavel_abertura;
    if (p.responsavel_fechamento) extras.responsavel_fechamento = p.responsavel_fechamento;
  }

  for (const [id, st] of Object.entries(status_itens)) {
    if (st === 'ok') delete justificativas_itens[id];
  }

  return { status_itens, justificativas_itens, notas_secoes, ...extras };
}

export function extrairRespostasPorTurno(
  template: ChecklistTemplate,
  turno: ChecklistTurno,
  respostas: ChecklistRespostasPayload
): ChecklistRespostasPayload {
  const ids = new Set(todosIdsItensTurno(template, turno));
  const status_itens: Record<string, ChecklistItemStatus> = {};
  const justificativas_itens: Record<string, string> = {};
  for (const [id, st] of Object.entries(respostas.status_itens)) {
    if (!ids.has(id)) continue;
    status_itens[id] = st;
    const j = respostas.justificativas_itens?.[id];
    if (j?.trim()) justificativas_itens[id] = j.trim();
  }
  const notas_secoes: Record<string, string> = {};
  for (const sec of template.secoes) {
    if (sec.turno_foco && sec.turno_foco !== turno) continue;
    const n = respostas.notas_secoes?.[sec.id];
    if (n?.trim()) notas_secoes[sec.id] = n.trim();
  }
  const out: ChecklistRespostasPayload = { status_itens, justificativas_itens, notas_secoes };
  if (turno === 'manha' && respostas.responsavel_abertura) {
    out.responsavel_abertura = respostas.responsavel_abertura;
  }
  if (turno === 'tarde' && respostas.responsavel_fechamento) {
    out.responsavel_fechamento = respostas.responsavel_fechamento;
  }
  if (respostas.setor) out.setor = respostas.setor;
  if (respostas.temperatura_geladeira) out.temperatura_geladeira = respostas.temperatura_geladeira;
  return out;
}

export function pendenciasDoRegistro(
  template: ChecklistTemplate,
  turno: ChecklistTurno,
  respostas: ChecklistRespostasPayload
): PendenciaOutroTurno[] {
  const lista: PendenciaOutroTurno[] = [];
  for (const sec of template.secoes) {
    if (sec.turno_foco !== turno) continue;
    for (const item of sec.itens) {
      if (respostas.status_itens[item.id] !== 'pendente') continue;
      lista.push({
        id: item.id,
        label: item.label,
        horario: item.horario,
        turno_origem: turno,
        status: 'pendente',
        justificativa: respostas.justificativas_itens?.[item.id] ?? '',
      });
    }
  }
  return lista;
}

export function validarProntoParaPublicarTurno(
  template: ChecklistTemplate,
  turno: ChecklistTurno,
  respostas: ChecklistRespostasPayload
): string | null {
  const ids = todosIdsItensTurno(template, turno);
  for (const id of ids) {
    const st = respostas.status_itens[id];
    if (st !== 'ok' && st !== 'pendente') {
      return 'Responda todos os itens do seu turno (OK ou Pendente) antes de publicar.';
    }
    if (st === 'pendente') {
      const j = respostas.justificativas_itens?.[id]?.trim() ?? '';
      if (j.length < 3) {
        return 'Itens pendentes precisam de justificativa antes de publicar.';
      }
    }
  }
  return null;
}


export async function listarSlotsDia(
  supabase: SupabaseClient,
  opts: {
    unidadeId: string;
    tipo: ChecklistTipo;
    dataReferencia?: string;
    diaSemana?: number;
  }
): Promise<ChecklistRegistro[]> {
  const dataRef = opts.dataReferencia?.trim() || dataOperacionalSaoPaulo();
  const diaSemana = opts.diaSemana ?? diaSemanaDeDataIso(dataRef);
  const turnos: ChecklistTurno[] = ['manha', 'tarde'];
  const rows: ChecklistRegistro[] = [];
  for (const turno of turnos) {
    const reg = await buscarChecklistSlot(supabase, {
      unidadeId: opts.unidadeId,
      tipo: opts.tipo,
      turno,
      dataReferencia: dataRef,
      diaSemana,
    });
    if (reg) rows.push(reg);
  }
  return rows;
}

function montarExibicaoDoDia(
  template: NonNullable<ReturnType<typeof templateChecklistPorTipo>>,
  unidadeId: string,
  tipo: ChecklistTipo,
  dataRef: string,
  registros: ChecklistRegistro[],
  ehHoje: boolean
): ChecklistExibicaoPublicada | null {
  const publicados = registros.filter((r) => r.publicado_em);
  if (publicados.length === 0) return null;
  const respostas = mesclarRespostasChecklist(...publicados.map((r) => r.respostas));
  const ids = template.secoes.flatMap((s) => s.itens.map((i) => i.id));
  const { ok, pendente, total } = contagemStatusItens(respostas.status_itens, ids);
  const publicadoEm = publicados
    .map((r) => r.publicado_em ?? '')
    .filter(Boolean)
    .sort()
    .reverse()[0];
  const porNome = publicados.find((r) => r.publicado_em === publicadoEm)?.publicado_por_nome;
  return {
    unidade_id: unidadeId,
    tipo,
    data_referencia: dataRef,
    dia_semana: diaSemanaDeDataIso(dataRef),
    eh_hoje: ehHoje,
    registros: publicados,
    respostas,
    publicado_em: publicadoEm,
    publicado_por_nome: porNome,
    ok,
    pendente,
    total,
  };
}

/** Publicação de hoje; se ainda não houver, o último dia publicado na janela de 7 dias (só leitura). */
export async function buscarExibicaoPublicada(
  supabase: SupabaseClient,
  opts: { unidadeId: string; tipo: ChecklistTipo }
): Promise<ChecklistExibicaoPublicada | null> {
  const template = templateChecklistPorTipo(opts.tipo);
  if (!template) return null;

  const hoje = dataOperacionalSaoPaulo();
  const slotsHoje = await listarSlotsDia(supabase, {
    unidadeId: opts.unidadeId,
    tipo: opts.tipo,
    dataReferencia: hoje,
  });
  const deHoje = montarExibicaoDoDia(template, opts.unidadeId, opts.tipo, hoje, slotsHoje, true);
  if (deHoje) return deHoje;

  const minimo = dataMinimaRetencaoChecklist();
  const { data: ultimo, error } = await supabase
    .from('checklists_operacionais')
    .select('data_referencia, dia_semana, publicado_em')
    .eq('unidade_id', opts.unidadeId)
    .eq('tipo', opts.tipo)
    .not('publicado_em', 'is', null)
    .gte('data_referencia', minimo)
    .order('data_referencia', { ascending: false })
    .order('publicado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message.includes('publicado_em')) return null;
    if (/data_referencia/i.test(error.message)) {
      // Pré-071: fallback pelo dia da semana do último publicado.
      const { data: leg } = await supabase
        .from('checklists_operacionais')
        .select('dia_semana, publicado_em')
        .eq('unidade_id', opts.unidadeId)
        .eq('tipo', opts.tipo)
        .not('publicado_em', 'is', null)
        .order('publicado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!leg?.publicado_em) return null;
      const dia = Number(leg.dia_semana);
      const slots = await listarSlotsDia(supabase, {
        unidadeId: opts.unidadeId,
        tipo: opts.tipo,
        diaSemana: dia,
        dataReferencia: hoje,
      });
      // Sem data_referencia, não inventa data — usa hoje só se o dia_semana coincidir.
      if (diaSemanaOperacionalSaoPaulo() === dia) {
        return montarExibicaoDoDia(template, opts.unidadeId, opts.tipo, hoje, slots, true);
      }
      return null;
    }
    throw new Error(error.message);
  }
  if (!ultimo?.publicado_em || !ultimo.data_referencia) return null;

  const dataRef = String(ultimo.data_referencia).slice(0, 10);
  const slots = await listarSlotsDia(supabase, {
    unidadeId: opts.unidadeId,
    tipo: opts.tipo,
    dataReferencia: dataRef,
  });
  return montarExibicaoDoDia(template, opts.unidadeId, opts.tipo, dataRef, slots, dataRef === hoje);
}

/** Histórico publicado dos últimos 7 dias (para conferência; o dia seguinte continua livre). */
export async function listarHistoricoPublicado7Dias(
  supabase: SupabaseClient,
  opts: { unidadeId: string; tipo: ChecklistTipo }
): Promise<ChecklistHistoricoDia[]> {
  const template = templateChecklistPorTipo(opts.tipo);
  if (!template) return [];
  const hoje = dataOperacionalSaoPaulo();
  const minimo = dataMinimaRetencaoChecklist();
  const { data, error } = await supabase
    .from('checklists_operacionais')
    .select('data_referencia, dia_semana, turno, respostas, publicado_em, publicado_por_id, updated_at')
    .eq('unidade_id', opts.unidadeId)
    .eq('tipo', opts.tipo)
    .not('publicado_em', 'is', null)
    .gte('data_referencia', minimo)
    .order('data_referencia', { ascending: false });

  if (error) {
    if (/data_referencia|publicado_em/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const porData = new Map<string, ChecklistRegistro[]>();
  for (const raw of data ?? []) {
    const dataRef = String((raw as { data_referencia?: string }).data_referencia ?? '').slice(0, 10);
    if (!dataRef) continue;
    const reg = {
      id: '',
      unidade_id: opts.unidadeId,
      tipo: opts.tipo,
      turno: (raw as { turno: ChecklistTurno }).turno,
      data_referencia: dataRef,
      dia_semana: Number((raw as { dia_semana: number }).dia_semana),
      colaborador_id: '',
      respostas: (raw as { respostas: ChecklistRespostasPayload }).respostas,
      observacoes: null,
      preenchido_em: '',
      updated_at: String((raw as { updated_at?: string }).updated_at ?? ''),
      publicado_em: String((raw as { publicado_em?: string }).publicado_em ?? ''),
      publicado_por_id: (raw as { publicado_por_id?: string | null }).publicado_por_id ?? null,
    } as ChecklistRegistro;
    const lista = porData.get(dataRef) ?? [];
    lista.push(reg);
    porData.set(dataRef, lista);
  }

  const out: ChecklistHistoricoDia[] = [];
  for (const [dataRef, regs] of Array.from(porData.entries())) {
    const ex = montarExibicaoDoDia(template, opts.unidadeId, opts.tipo, dataRef, regs, dataRef === hoje);
    if (!ex) continue;
    out.push({
      data_referencia: dataRef,
      dia_semana: ex.dia_semana,
      publicado_em: ex.publicado_em,
      publicado_por_nome: ex.publicado_por_nome,
      ok: ex.ok,
      pendente: ex.pendente,
      total: ex.total,
      eh_hoje: ex.eh_hoje,
      respostas: ex.respostas,
    });
  }
  out.sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
  return out;
}

export function pendenciasOutroTurnoParaFormulario(
  template: ChecklistTemplate,
  turnoAtual: ChecklistTurno,
  slotsDia: ChecklistRegistro[]
): PendenciaOutroTurno[] {
  const origem = outroTurno(turnoAtual);
  const reg = slotsDia.find((r) => r.turno === origem);
  if (!reg) return [];
  return pendenciasDoRegistro(template, origem, reg.respostas);
}

/** Aplica respostas nos slots corretos (turno atual + resoluções do outro plantão). */
export function particionarRespostasMultiTurno(
  template: ChecklistTemplate,
  turnoAtual: ChecklistTurno,
  respostas: ChecklistRespostasPayload
): Record<ChecklistTurno, ChecklistRespostasPayload> {
  const manha = extrairRespostasPorTurno(template, 'manha', respostas);
  const tarde = extrairRespostasPorTurno(template, 'tarde', respostas);
  return { manha, tarde };
}

export function itemPertenceTurno(template: ChecklistTemplate, itemId: string, turno: ChecklistTurno): boolean {
  const t = turnoDoItem(template, itemId);
  return t === turno;
}
