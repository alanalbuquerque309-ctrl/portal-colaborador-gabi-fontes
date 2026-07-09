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
import { diaSemanaOperacionalSaoPaulo } from '@/lib/checklists/dia-semana';

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
  dia_semana: number;
  registros: ChecklistRegistro[];
  respostas: ChecklistRespostasPayload;
  publicado_em: string;
  publicado_por_nome?: string;
  ok: number;
  pendente: number;
  total: number;
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
  opts: { unidadeId: string; tipo: ChecklistTipo; diaSemana: number }
): Promise<ChecklistRegistro[]> {
  const turnos: ChecklistTurno[] = ['manha', 'tarde'];
  const rows: ChecklistRegistro[] = [];
  for (const turno of turnos) {
    const reg = await buscarChecklistSlot(supabase, { ...opts, turno });
    if (reg) rows.push(reg);
  }
  return rows;
}

/** Última publicação visível no portal (dia atual ou cohort do último publicado). */
export async function buscarExibicaoPublicada(
  supabase: SupabaseClient,
  opts: { unidadeId: string; tipo: ChecklistTipo }
): Promise<ChecklistExibicaoPublicada | null> {
  const template = templateChecklistPorTipo(opts.tipo);
  if (!template) return null;

  const diaHoje = diaSemanaOperacionalSaoPaulo();

  let cohortDia = diaHoje;
  const slotsHoje = (await listarSlotsPublicadosCohort(supabase, opts.unidadeId, opts.tipo, diaHoje)).filter(
    (r) => r.publicado_em
  );
  if (slotsHoje.length === 0) {
    const { data: ultimo, error } = await supabase
      .from('checklists_operacionais')
      .select('dia_semana, publicado_em')
      .eq('unidade_id', opts.unidadeId)
      .eq('tipo', opts.tipo)
      .not('publicado_em', 'is', null)
      .order('publicado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (error.message.includes('publicado_em')) return null;
      throw new Error(error.message);
    }
    if (!ultimo?.publicado_em) return null;
    cohortDia = Number(ultimo.dia_semana);
  }

  const registros = (await listarSlotsPublicadosCohort(supabase, opts.unidadeId, opts.tipo, cohortDia)).filter(
    (r) => r.publicado_em
  );
  if (registros.length === 0) return null;

  const respostas = mesclarRespostasChecklist(...registros.map((r) => r.respostas));
  const ids = template.secoes.flatMap((s) => s.itens.map((i) => i.id));
  const { ok, pendente, total } = contagemStatusItens(respostas.status_itens, ids);

  const publicadoEm = registros
    .map((r) => r.publicado_em ?? '')
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const porNome = registros.find((r) => r.publicado_em === publicadoEm)?.publicado_por_nome;

  return {
    unidade_id: opts.unidadeId,
    tipo: opts.tipo,
    dia_semana: cohortDia,
    registros,
    respostas,
    publicado_em: publicadoEm,
    publicado_por_nome: porNome,
    ok,
    pendente,
    total,
  };
}

async function listarSlotsPublicadosCohort(
  supabase: SupabaseClient,
  unidadeId: string,
  tipo: ChecklistTipo,
  diaSemana: number
): Promise<ChecklistRegistro[]> {
  return listarSlotsDia(supabase, { unidadeId, tipo, diaSemana });
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
