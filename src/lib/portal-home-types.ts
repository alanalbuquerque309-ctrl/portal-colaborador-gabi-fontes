export type PortalHomeTarefa = {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
  urgente?: boolean;
  acaoLabel?: string;
  hero?: boolean;
};

export type PortalHomeSituacaoNivel = 'ok' | 'atencao' | 'urgente';

export type PortalHomeSituacao = {
  nivel: PortalHomeSituacaoNivel;
  total: number;
  mensagem: string;
};

export type PortalHomeRankingEscopo = {
  posicao: number | null;
  total: number;
  media: number | null;
  semanas_avaliadas: number;
  no_top3: boolean;
  label_escopo: string;
  top3: { nome: string; media: number }[];
};

export type PortalHomeCriterio = {
  id: string;
  label: string;
  media: number | null;
  percentual: number | null;
};

export type PortalHomeTrofeuRecebido = {
  id: string;
  tipo: string;
  titulo: string;
  emoji: string;
  avaliador_nome: string;
  created_at: string;
};

export type PortalHomePainel = {
  primeiro_nome: string;
  media_mes: number | null;
  semanas_avaliadas: number;
  mes_referencia: string;
  frase_motivacional: string;
  criterios: PortalHomeCriterio[];
  ranking_unidade: PortalHomeRankingEscopo;
  ranking_geral: PortalHomeRankingEscopo;
  graos: {
    saldo_confirmado: number;
    saldo_pendente: number;
    nivel_emoji: string;
    nivel_label: string;
  };
  trofeus: {
    total_recebidos: number;
    ultimos: PortalHomeTrofeuRecebido[];
  };
};

export type ILIComponente = {
  label: string;
  pontos: number;
  peso: number;
  contribuicao: number;
};

export type PainelLider = {
  primeiro_nome: string;
  ili: number;
  componentes: ILIComponente[];
  n_equipe: number;
  n_avaliados_semana: number;
  n_feedback_semana: number;
  semana_rotulo: string;
  semana_inicio: string;
  elegivel: boolean;
  motivos_elegibilidade: string[];
  posicao_entre_lideres: number | null;
  total_lideres_elegiveis: number;
  eh_vencedor_semana: boolean;
};

export type LiderInspiradorVencedor = {
  lider_id: string;
  nome: string;
  foto_url: string | null;
  unidade_nome: string;
  setor: string | null;
  ili: number;
  motivos: string[];
  semana_rotulo: string;
  semana_inicio: string;
};

export type PortalHomeResumo = {
  ok: true;
  role: string;
  is_colaborador: boolean;
  is_lider: boolean;
  situacao: PortalHomeSituacao;
  tarefas: PortalHomeTarefa[];
  painel: PortalHomePainel | null;
  painel_lider: PainelLider | null;
  /** true quando o shell ainda vai buscar painel em /api/portal/home-painel */
  painel_pendente?: boolean;
};
