export const GRAOS_RESGATE_SAIR_CEDO_MEDIA_MIN = 4;

/** Segunda-feira da 1ª semana com Grãos ativos (piloto operação). Anterior = sem crédito. */

export const GRAOS_PRIMEIRA_SEMANA_INICIO = '2026-06-15';



/** Valor interno para complemento em dinheiro no caixa (35 grãos ≈ R$ 15). */

export const GRAOS_CENTAVOS_POR_GRAO = Math.round((1500 / 35) * 100) / 100;



export const GRAOS_MISSAO = {

  login_semana: 5,

  aviso_semana: 5,

  lideranca_semana: 10,

  sugestao_semana: 1,

  sugestao_destaque_bonus: 9,

  quinta: 5,

} as const;



/** Máximo por sugestão: 1 (envio) + 9 (resposta da gestão). */

export const GRAOS_SUGESTAO_MAX_SEMANA =

  GRAOS_MISSAO.sugestao_semana + GRAOS_MISSAO.sugestao_destaque_bonus;



export const GRAOS_MAX_SEMANA =

  GRAOS_MISSAO.login_semana +

  GRAOS_MISSAO.aviso_semana +

  GRAOS_MISSAO.lideranca_semana +

  GRAOS_SUGESTAO_MAX_SEMANA +

  GRAOS_MISSAO.quinta +

  5; /* troféus máx. */



export type GraosMissaoId =

  | 'login_semana'

  | 'aviso_semana'

  | 'lideranca_semana'

  | 'trofeu_semana'

  | 'sugestao_semana'

  | 'sugestao_destaque'

  | 'quinta'

  | 'onboarding';



export const GRAOS_NIVEL_FAIXAS = [

  { id: 'semente', emoji: '🌱', label: 'Semente do café', min: 0, max: 99 },

  { id: 'broto', emoji: '🌿', label: 'Broto do café', min: 100, max: 299 },

  { id: 'arvore', emoji: '🌳', label: 'Árvore do café', min: 300, max: 799 },

  { id: 'master', emoji: '⭐', label: 'Gabi Fonte Master', min: 800, max: Infinity },

] as const;


