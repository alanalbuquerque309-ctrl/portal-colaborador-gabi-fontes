export type ChecklistTurno = 'manha' | 'tarde';

export type ChecklistTipo = 'gerencia_diaria_mesquita';

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
  campos_extras?: Array<
    | { id: 'setor'; label: string; tipo: 'text' }
    | { id: 'temperatura_geladeira'; label: string; tipo: 'text'; placeholder?: string }
    | { id: 'responsavel_abertura'; label: string; tipo: 'text' }
    | { id: 'responsavel_fechamento'; label: string; tipo: 'text' }
  >;
  secoes: ChecklistSecao[];
  exige_unidade_slug?: string[];
};

export type ChecklistRespostasPayload = {
  itens: Record<string, boolean>;
  notas_secoes?: Record<string, string>;
  setor?: string;
  temperatura_geladeira?: string;
  responsavel_abertura?: string;
  responsavel_fechamento?: string;
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
