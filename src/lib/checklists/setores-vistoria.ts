import type { ChecklistSetorVistoria, ChecklistTipo } from '@/lib/checklists/types';

export type SetorVistoriaConfig = {
  setor: ChecklistSetorVistoria;
  label: string;
  emoji: string;
  tipo_checklist: ChecklistTipo;
  descricao: string;
};

/** Setores que a gerência Mesquita vistoria ao longo do dia. */
export const SETORES_VISTORIA_MESQUITA: SetorVistoriaConfig[] = [
  {
    setor: 'estoque',
    label: 'Estoque',
    emoji: '📦',
    tipo_checklist: 'estoque_diario_mesquita',
    descricao: 'Conferir se o estoque preencheu o checklist diário.',
  },
  {
    setor: 'asg',
    label: 'ASG',
    emoji: '🧹',
    tipo_checklist: 'asg_diario_mesquita',
    descricao: 'Conferir limpeza e rotinas do ASG.',
  },
  {
    setor: 'cozinha',
    label: 'Cozinha',
    emoji: '👨‍🍳',
    tipo_checklist: 'cozinha_diario_mesquita',
    descricao: 'Conferir checklist do chefe de cozinha.',
  },
  {
    setor: 'balcao',
    label: 'Balcão',
    emoji: '☕',
    tipo_checklist: 'balcao_diario_mesquita',
    descricao: 'Conferir abertura e rotina do balcão e salão.',
  },
  {
    setor: 'caixa',
    label: 'Caixa',
    emoji: '💰',
    tipo_checklist: 'caixa_diario_mesquita',
    descricao: 'Conferir abertura, operação e fechamento do caixa.',
  },
];

export function configSetorVistoria(setor: string): SetorVistoriaConfig | null {
  return SETORES_VISTORIA_MESQUITA.find((s) => s.setor === setor) ?? null;
}

export function tipoChecklistPorSetor(setor: ChecklistSetorVistoria): ChecklistTipo {
  const cfg = configSetorVistoria(setor);
  if (!cfg) throw new Error('Setor inválido');
  return cfg.tipo_checklist;
}
