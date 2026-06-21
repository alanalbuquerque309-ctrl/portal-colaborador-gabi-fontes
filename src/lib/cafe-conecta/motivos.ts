import type { CafeConectaMotivoInelegivel } from '@/lib/cafe-conecta/types';

/** Rótulo curto (contadores, colunas). */
export function rotuloMotivoInelegibilidadeCafeConecta(m: CafeConectaMotivoInelegivel | null): string {
  switch (m) {
    case 'ferias':
      return 'Férias';
    case 'afastado':
      return 'Afastado';
    case 'folga_quarta':
      return 'Folga na quarta';
    case 'sem_acesso_portal':
      return 'Sem acesso ao portal';
    case 'onboarding_pendente':
      return 'Cadastro pendente';
    case 'perfil_nao_participa':
      return 'Perfil não participa';
    default:
      return '—';
  }
}

/** Texto operacional para RH (listas do admin). */
export function descricaoMotivoInelegibilidadeCafeConecta(m: CafeConectaMotivoInelegivel | null): string {
  switch (m) {
    case 'ferias':
      return 'Registrado de férias nesta semana (avaliação semanal).';
    case 'afastado':
      return 'Afastado ou licença na avaliação desta semana.';
    case 'folga_quarta':
      return 'Folga na quarta-feira desta semana (escala ou avaliação).';
    case 'sem_acesso_portal':
      return 'Não entrou no portal esta semana (faltam Grãos login_semana, segunda a quarta).';
    case 'onboarding_pendente':
      return 'Cadastro no portal ainda não concluído.';
    case 'perfil_nao_participa':
      return 'Perfil não participa do Café Conecta (líder, RH, gerente, etc.).';
    default:
      return '—';
  }
}

export const CAFE_CONECTA_AVISO_VIRADA_SEMANA =
  'Listas recalculadas a cada nova semana (segunda-feira, 0h, horário de São Paulo). Acesso ao portal, férias, folga e sorteio recomeçam do zero.';
