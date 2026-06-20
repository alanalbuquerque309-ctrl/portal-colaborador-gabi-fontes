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

export type PortalHomeResumo = {
  ok: true;
  role: string;
  is_colaborador: boolean;
  situacao: PortalHomeSituacao;
  tarefas: PortalHomeTarefa[];
  painel: PortalHomePainel | null;
};
