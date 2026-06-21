export type CafeConectaMotivoInelegivel =
  | 'perfil_nao_participa'
  | 'ferias'
  | 'afastado'
  | 'folga_quarta'
  | 'sem_acesso_portal'
  | 'onboarding_pendente';

export type CafeConectaColaboradorBase = {
  id: string;
  nome: string;
  setor: string | null;
  cargo: string | null;
  unidade_id: string;
  unidade_nome: string;
  unidade_slug: string;
  role: string;
};

export type CafeConectaElegibilidadeLinha = CafeConectaColaboradorBase & {
  elegivel: boolean;
  motivo: CafeConectaMotivoInelegivel | null;
};

export type CafeConectaParticipanteCard = {
  ordem: number;
  colaborador_id: string;
  nome: string;
  setor: string | null;
  setor_label: string;
  unidade_nome: string;
};

export type CafeConectaSorteioRow = {
  id: string;
  grupo_slug: string;
  ciclo_id: string;
  semana_inicio: string;
  data_referencia: string;
  status: 'rascunho' | 'publicado';
  seed: string | null;
  excecao_ciclo_impar: boolean;
  observacao_admin: string | null;
  publicado_por: string | null;
  publicado_em: string | null;
  publicado_por_nome?: string | null;
  participantes?: CafeConectaParticipanteCard[];
};

export type CafeConectaCicloResumo = {
  id: string;
  numero: number;
  participaram: number;
  total_base: number;
  restantes: number;
  pct: number;
};

export type CafeConectaHistoricoItem = {
  id: string;
  data_referencia: string;
  semana_inicio: string;
  status: string;
  ciclo_numero: number;
  publicado_por_nome: string | null;
  publicado_em: string | null;
  participantes: CafeConectaParticipanteCard[];
};

export type CafeConectaDuplaHistorico = {
  chave: string;
  vezes: number;
  ultima_data: string;
  pessoa_a: { nome: string; setor_label: string };
  pessoa_b: { nome: string; setor_label: string };
};

export type CafeConectaMetricasEngajamento = {
  sorteios_publicados: number;
  feedback_total: number;
  feedback_semana: number;
  por_reacao: Record<string, number>;
};

export type CafeConectaParticipacaoPerfil = {
  sorteio_id: string;
  data_referencia: string;
  parceiro_nome: string;
  parceiro_setor: string;
  ciclo_numero: number;
};

export type CafeConectaResumoPerfil = {
  total_participacoes: number;
  dias_desde_ultima: number | null;
  participacoes: CafeConectaParticipacaoPerfil[];
};

export type CafeConectaDashboardPayload = {
  ok: true;
  grupo: { slug: string; label: string };
  semana_inicio: string;
  data_referencia: string;
  alerta_quinta: boolean;
  elegibilidade: {
    total_base: number;
    elegiveis: number;
    nao_elegiveis: number;
    ferias: number;
    afastados: number;
    folga: number;
    sem_acesso: number;
    lista: CafeConectaElegibilidadeLinha[];
  };
  sorteio_atual: CafeConectaSorteioRow | null;
  ciclo: CafeConectaCicloResumo | null;
  historico: CafeConectaHistoricoItem[];
  duplas?: CafeConectaDuplaHistorico[];
  metricas?: CafeConectaMetricasEngajamento;
  tabelas_ok: boolean;
};

export type CafeConectaAtualPortal = {
  ok: true;
  sorteio: {
    id: string;
    data_referencia: string;
    participantes: CafeConectaParticipanteCard[];
    minha_reacao: string | null;
    feedback_total: number;
  } | null;
};
