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
    case 'fora_plantao':
      return 'Fora do plantão';
    case 'sem_acesso_portal':
      return 'Sem login na semana';
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
      return 'Folga na quarta-feira desta semana (escala 5x2 ou 6x1, ou avaliação).';
    case 'fora_plantao':
      return 'Escala 12x36 fora do plantão ativo nesta quarta (avaliado por outro líder ou sem avaliação no plantão de hoje).';
    case 'sem_acesso_portal':
      return 'Não entrou no portal esta semana (segunda a quarta): falta login ou uso registrado no app.';
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

/** Texto pronto para comunicado interno (copiar e colar). */
export const CAFE_CONECTA_TEXTO_COMUNICADO_EQUIPE = `☕ Café Conecta — quem participa do sorteio desta quarta?

Para entrar no sorteio você precisa:
• Ter entrado no portal pelo menos uma vez entre segunda e quarta desta semana.
• Não estar de férias nem afastado(a).
• Estar em dia com a escala do dia (regras abaixo).

Escalas 5x2 e 6x1: participam normalmente. Quem está de folga na quarta-feira não entra no sorteio.

Escala 12x36: só participa quem está no plantão ativo nesta quarta. Quem está no plantão de amanhã (outro turno) não participa — o sistema identifica pela avaliação semanal do líder de plantão (presente ou falta no plantão de hoje; «fora do plantão» ou sem avaliação do líder de hoje = não participa).

O sorteio é feito pelo RH/admin na quarta; o resultado aparece na home do portal. Boa semana!`;
