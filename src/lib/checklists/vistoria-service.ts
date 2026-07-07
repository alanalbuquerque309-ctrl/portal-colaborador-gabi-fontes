import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChecklistSetorVistoria,
  ChecklistVistoriaRegistro,
  ChecklistVistoriaStatus,
} from '@/lib/checklists/types';
import { SETORES_VISTORIA_MESQUITA } from '@/lib/checklists/setores-vistoria';

type VistoriaRowDb = {
  id: string;
  unidade_id: string;
  setor: string;
  dia_semana: number;
  colaborador_id: string;
  status: string;
  checklist_operacional_id: string | null;
  observacoes: string | null;
  vistoriado_em: string;
  updated_at: string;
  colaboradores?: { nome?: string } | { nome?: string }[] | null;
};

function mapVistoriaRow(row: VistoriaRowDb): ChecklistVistoriaRegistro {
  const c = row.colaboradores;
  const colab = Array.isArray(c) ? c[0] : c;
  return {
    id: row.id,
    unidade_id: row.unidade_id,
    setor: row.setor as ChecklistSetorVistoria,
    dia_semana: Number(row.dia_semana),
    colaborador_id: row.colaborador_id,
    colaborador_nome: colab?.nome ? String(colab.nome) : undefined,
    status: row.status as ChecklistVistoriaStatus,
    checklist_operacional_id: row.checklist_operacional_id,
    observacoes: row.observacoes,
    vistoriado_em: String(row.vistoriado_em),
    updated_at: String(row.updated_at),
  };
}

export type SetorVistoriaResumo = {
  setor: ChecklistSetorVistoria;
  label: string;
  emoji: string;
  tipo_checklist: string;
  descricao: string;
  preenchido: boolean;
  turnos_preenchidos: string[];
  vistoria: ChecklistVistoriaRegistro | null;
  status_efetivo: ChecklistVistoriaStatus;
};

export async function listarVistoriaSetoresDia(
  supabase: SupabaseClient,
  opts: { unidadeId: string; diaSemana: number }
): Promise<SetorVistoriaResumo[]> {
  const { data: checklistsRaw, error: errCheck } = await supabase
    .from('checklists_operacionais')
    .select('id, tipo, turno')
    .eq('unidade_id', opts.unidadeId)
    .eq('dia_semana', opts.diaSemana);

  if (errCheck && !errCheck.message.toLowerCase().includes('does not exist')) {
    throw new Error(errCheck.message);
  }

  const checklists = checklistsRaw ?? [];
  const porTipo = new Map<string, { ids: string[]; turnos: Set<string> }>();
  for (const row of checklists) {
    const tipo = String((row as { tipo?: string }).tipo ?? '');
    const turno = String((row as { turno?: string }).turno ?? '');
    const id = String((row as { id?: string }).id ?? '');
    if (!porTipo.has(tipo)) porTipo.set(tipo, { ids: [], turnos: new Set() });
    const bucket = porTipo.get(tipo)!;
    bucket.ids.push(id);
    if (turno) bucket.turnos.add(turno);
  }

  const { data: vistoriasRaw, error: errVis } = await supabase
    .from('checklists_vistoria_gerencia')
    .select(
      'id, unidade_id, setor, dia_semana, colaborador_id, status, checklist_operacional_id, observacoes, vistoriado_em, updated_at, colaboradores(nome)'
    )
    .eq('unidade_id', opts.unidadeId)
    .eq('dia_semana', opts.diaSemana);

  if (errVis && !errVis.message.toLowerCase().includes('does not exist')) {
    throw new Error(errVis.message);
  }

  const vistoriaPorSetor = new Map<string, ChecklistVistoriaRegistro>();
  for (const row of vistoriasRaw ?? []) {
    const setor = String((row as { setor?: string }).setor ?? '');
    vistoriaPorSetor.set(setor, mapVistoriaRow(row as VistoriaRowDb));
  }

  return SETORES_VISTORIA_MESQUITA.map((cfg) => {
    const bucket = porTipo.get(cfg.tipo_checklist);
    const preenchido = Boolean(bucket?.ids.length);
    const vistoria = vistoriaPorSetor.get(cfg.setor) ?? null;
    let status_efetivo: ChecklistVistoriaStatus = 'nao_preenchido';
    if (vistoria?.status === 'conferido') status_efetivo = 'conferido';
    else if (vistoria?.status === 'pendente') status_efetivo = 'pendente';
    else if (preenchido) status_efetivo = 'pendente';

    return {
      setor: cfg.setor,
      label: cfg.label,
      emoji: cfg.emoji,
      tipo_checklist: cfg.tipo_checklist,
      descricao: cfg.descricao,
      preenchido,
      turnos_preenchidos: bucket ? Array.from(bucket.turnos) : [],
      vistoria,
      status_efetivo,
    };
  });
}

export async function salvarVistoriaSetor(
  supabase: SupabaseClient,
  opts: {
    unidadeId: string;
    setor: ChecklistSetorVistoria;
    diaSemana: number;
    colaboradorId: string;
    status: ChecklistVistoriaStatus;
    observacoes: string | null;
    tipoChecklist: string;
  }
): Promise<ChecklistVistoriaRegistro> {
  let checklistOperacionalId: string | null = null;
  if (opts.status === 'conferido') {
    const { data: reg } = await supabase
      .from('checklists_operacionais')
      .select('id, updated_at')
      .eq('unidade_id', opts.unidadeId)
      .eq('tipo', opts.tipoChecklist)
      .eq('dia_semana', opts.diaSemana)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reg?.id) checklistOperacionalId = String(reg.id);
  }

  const agora = new Date().toISOString();
  const payload = {
    unidade_id: opts.unidadeId,
    setor: opts.setor,
    dia_semana: opts.diaSemana,
    colaborador_id: opts.colaboradorId,
    status: opts.status,
    checklist_operacional_id: checklistOperacionalId,
    observacoes: opts.observacoes,
    vistoriado_em: agora,
    updated_at: agora,
  };

  const { data, error } = await supabase
    .from('checklists_vistoria_gerencia')
    .upsert(payload, { onConflict: 'unidade_id,setor,dia_semana' })
    .select(
      'id, unidade_id, setor, dia_semana, colaborador_id, status, checklist_operacional_id, observacoes, vistoriado_em, updated_at, colaboradores(nome)'
    )
    .single();

  if (error) throw new Error(error.message);
  return mapVistoriaRow(data as VistoriaRowDb);
}
