export type ChecklistTurno = 'manha' | 'tarde';

export type ChecklistTipo =
  | 'abertura_setor'
  | 'abertura_balcao_salao'
  | 'fechamento_salao'
  | 'fechamento_geral';

export type ChecklistSecao = {
  id: string;
  titulo: string;
  itens: { id: string; label: string }[];
  permite_nota?: boolean;
};

export type ChecklistTemplate = {
  tipo: ChecklistTipo;
  titulo: string;
  descricao: string;
  turnos: ChecklistTurno[];
  /** Campo extra no formulário (ex.: setor, temperatura). */
  campos_extras?: Array<
    | { id: 'setor'; label: string; tipo: 'text' }
    | { id: 'temperatura_geladeira'; label: string; tipo: 'text'; placeholder?: string }
  >;
  secoes: ChecklistSecao[];
  exige_unidade_slug?: string[];
};

export type ChecklistRespostasPayload = {
  itens: Record<string, boolean>;
  notas_secoes?: Record<string, string>;
  setor?: string;
  temperatura_geladeira?: string;
};

export type ChecklistRegistro = {
  id: string;
  unidade_id: string;
  unidade_nome?: string;
  unidade_slug?: string;
  tipo: ChecklistTipo;
  turno: ChecklistTurno;
  dia_semana: number;
  colaborador_id: string;
  colaborador_nome?: string;
  respostas: ChecklistRespostasPayload;
  observacoes: string | null;
  preenchido_em: string;
  updated_at: string;
};
