export type ChecklistTurno = 'manha' | 'tarde';

export type ChecklistItemStatus = 'ok' | 'pendente';

export type ChecklistSetorVistoria = 'estoque' | 'asg' | 'cozinha' | 'balcao' | 'caixa';

export type ChecklistVistoriaStatus = 'conferido' | 'pendente' | 'nao_preenchido';

export type ChecklistTipo =
  | 'gerencia_diaria_mesquita'
  | 'estoque_diario_mesquita'
  | 'asg_diario_mesquita'
  | 'cozinha_diario_mesquita'
  | 'balcao_diario_mesquita'
  | 'caixa_diario_mesquita';

export type ChecklistSecao = {
  id: string;
  titulo: string;
  /** Se definido, a seção só aparece neste turno do formulário. */
  turno_foco?: ChecklistTurno;
  itens: { id: string; label: string; horario?: string }[];
  permite_nota?: boolean;
};

export type ChecklistTemplate = {
  tipo: ChecklistTipo;
  titulo: string;
  descricao: string;
  turnos: ChecklistTurno[];
  papel: 'gerencia' | 'setor';
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
  /** Status por item: OK ou pendente (com justificativa). */
  status_itens: Record<string, ChecklistItemStatus>;
  justificativas_itens?: Record<string, string>;
  /** Legado (checkbox): migrado para status_itens na leitura. */
  itens?: Record<string, boolean>;
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
  /** Data civil YYYY-MM-DD (chave da janela de 7 dias). */
  data_referencia?: string;
  dia_semana: number;
  colaborador_id: string;
  colaborador_nome?: string;
  respostas: ChecklistRespostasPayload;
  observacoes: string | null;
  preenchido_em: string;
  updated_at: string;
  /** Preenchido após «Publicar»; visível no portal para conferência. */
  publicado_em?: string | null;
  publicado_por_id?: string | null;
  publicado_por_nome?: string;
};

export type ChecklistVistoriaRegistro = {
  id: string;
  unidade_id: string;
  setor: ChecklistSetorVistoria;
  dia_semana: number;
  colaborador_id: string;
  colaborador_nome?: string;
  status: ChecklistVistoriaStatus;
  checklist_operacional_id: string | null;
  observacoes: string | null;
  vistoriado_em: string;
  updated_at: string;
};
