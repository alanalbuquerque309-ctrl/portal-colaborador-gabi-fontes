/**
 * Tipos globais do Portal do Colaborador
 */

export type Unidade = 'mesquita' | 'barra' | 'nova_iguacu';

export interface Colaborador {
  id: string;
  cpf: string;
  nome: string;
  email?: string;
  unidade: Unidade;
  onboarding_completo: boolean;
  termo_aceito_em?: string;
  created_at: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  unidade: Unidade;
  destaque: boolean;
  created_at: string;
}

export interface RelatoPerda {
  id: string;
  colaborador_id: string;
  item: string;
  motivo: string;
  foto_url?: string;
  unidade: Unidade;
  created_at: string;
}

export interface Aniversariante {
  id: string;
  nome: string;
  unidade: Unidade;
  data_aniversario: string; // MM-DD
  created_at: string;
}
