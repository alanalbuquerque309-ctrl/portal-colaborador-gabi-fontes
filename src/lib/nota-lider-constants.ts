/** Pesos e mínimos da nota do líder (0–100). Sem imports de servidor — safe para client components. */

export const NOTA_LIDER_PESOS = {
  feedback: 0.4,
  equipe: 0.3,
  disciplina: 0.15,
  treinamentos: 0.1,
  engajamento: 0.05,
} as const;

export const NOTA_LIDER_MIN_EQUIPE = 3;
export const NOTA_LIDER_MIN_PCT_AVALIADO = 0.4;
export const NOTA_LIDER_MIN_FEEDBACK = 2;
export const NOTA_LIDER_CAP_INFLACAO = 85;

/** @deprecated use NOTA_LIDER_* — aliases legados */
export const ILI_PESOS = NOTA_LIDER_PESOS;
export const ILI_MIN_EQUIPE = NOTA_LIDER_MIN_EQUIPE;
export const ILI_MIN_PCT_AVALIADO = NOTA_LIDER_MIN_PCT_AVALIADO;
export const ILI_MIN_FEEDBACK = NOTA_LIDER_MIN_FEEDBACK;
export const ILI_CAP_INFLACAO = NOTA_LIDER_CAP_INFLACAO;
