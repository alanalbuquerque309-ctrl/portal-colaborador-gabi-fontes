export type TreinamentoPortalItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_conteudo?: 'video' | 'texto';
  conteudo_texto?: string | null;
  exige_confirmacao: boolean;
  visualizado: boolean;
  confirmado: boolean;
  embed_url: string | null;
  created_at?: string | null;
  arquivado?: boolean;
  /** todos = equipe inteira; lideranca = gerentes, RH, admin e sócios */
  publico_alvo?: 'todos' | 'lideranca' | null;
};

export const TREINO_IDS_EXTRAS = new Set(['video-institutional']);

export function ehUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export type StatusTreino = 'concluido' | 'visualizado' | 'pendente' | 'nao_fez';

/** Status real do treino, sem tratar arquivado como concluído. */
export function statusTreino(t: TreinamentoPortalItem): StatusTreino {
  if (t.confirmado) return 'concluido';
  if (!t.exige_confirmacao && t.visualizado) return 'concluido';
  if (t.visualizado) return 'visualizado';
  if (t.arquivado) return 'nao_fez';
  return 'pendente';
}

export function ehConcluidoSemana(t: TreinamentoPortalItem): boolean {
  return statusTreino(t) === 'concluido';
}

export function rotuloSemanaItem(t: TreinamentoPortalItem): string {
  if (!t.created_at) return t.titulo;
  const d = new Date(t.created_at);
  if (isNaN(d.getTime())) return t.titulo;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `Semana de ${dia}/${mes}`;
}

export function categorizarTreinamentos(itens: TreinamentoPortalItem[]) {
  const semana = itens.filter((t) => !t.arquivado && !TREINO_IDS_EXTRAS.has(t.id));
  const historico = itens.filter((t) => Boolean(t.arquivado) && ehUuid(t.id));
  const extras = itens.filter((t) => TREINO_IDS_EXTRAS.has(t.id));
  return { semana, historico, extras };
}

export function labelStatusTreino(status: StatusTreino): string {
  switch (status) {
    case 'concluido':
      return 'Concluído';
    case 'visualizado':
      return 'Visualizou, não confirmou';
    case 'nao_fez':
      return 'Não concluiu';
    default:
      return 'Pendente';
  }
}

export type EtiquetaPublicoTreinamento = {
  titulo: string;
  subtitulo: string;
  classe: string;
};

/** Rótulo visível do público-alvo (equipe vs liderança). */
export function etiquetaPublicoTreinamento(
  publico: TreinamentoPortalItem['publico_alvo'],
  itemId?: string
): EtiquetaPublicoTreinamento {
  if (publico === 'lideranca' || itemId === 'quinta-lider') {
    return {
      titulo: 'Treinamento de liderança',
      subtitulo: 'Gerentes, RH, admin e sócios',
      classe: 'bg-coffee-base/10 text-coffee-base border border-coffee-base/25',
    };
  }
  if (publico === 'todos' || itemId === 'quinta-colaborador') {
    return {
      titulo: 'Treinamento de equipe',
      subtitulo: 'Toda a operação',
      classe: 'bg-dourado-base/15 text-coffee-base border border-dourado-base/35',
    };
  }
  return {
    titulo: 'Material',
    subtitulo: '',
    classe: 'bg-cafeteria-100 text-cafeteria-700 border border-cafeteria-200',
  };
}

export function ehTreinamentoLideranca(item: TreinamentoPortalItem): boolean {
  return item.publico_alvo === 'lideranca' || item.id === 'quinta-lider';
}

export function ehTreinamentoEquipe(item: TreinamentoPortalItem): boolean {
  if (ehTreinamentoLideranca(item)) return false;
  return item.publico_alvo === 'todos' || item.id === 'quinta-colaborador' || Boolean(item.publico_alvo == null && ehUuid(item.id));
}

export function agruparSemanaPorPublico(semana: TreinamentoPortalItem[]) {
  const equipe = semana.filter((t) => ehTreinamentoEquipe(t));
  const lideranca = semana.filter((t) => ehTreinamentoLideranca(t));
  const outros = semana.filter((t) => !ehTreinamentoEquipe(t) && !ehTreinamentoLideranca(t));
  return { equipe, lideranca, outros };
}
