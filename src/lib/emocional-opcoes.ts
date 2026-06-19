/** Opções do termômetro de emoções (colaboradores). */

export type EmocaoId =
  | 'animado'
  | 'empolgado'
  | 'motivado'
  | 'confiante'
  | 'sobrecarregado'
  | 'estressado'
  | 'desanimado'
  | 'ansioso'
  | 'irritado'
  | 'decepcionado'
  | 'determinado'
  | 'grato'
  | 'em_paz';

export type EmocaoOpcao = {
  id: EmocaoId | string;
  label: string;
  emoji: string;
  desc: string;
  negativa?: boolean;
};

/** Legado (registros antigos no banco) — só exibição. */
const EMOCOES_LEGADO: EmocaoOpcao[] = [
  { id: 'feliz', label: 'Feliz', emoji: '😊', desc: 'Ótimo dia!' },
  { id: 'tranquilo', label: 'Tranquilo', emoji: '😌', desc: 'Tudo bem' },
  { id: 'neutro', label: 'Neutro', emoji: '😐', desc: 'Sem novidades' },
  { id: 'cansado', label: 'Cansado', emoji: '😓', desc: 'Preciso de um respiro', negativa: true },
  { id: 'frustrado', label: 'Frustrado', emoji: '😤', desc: 'Não está fácil', negativa: true },
  { id: 'triste', label: 'Triste', emoji: '😢', desc: 'Dia pesado', negativa: true },
];

export const EMOCOES_TERMOMETRO: EmocaoOpcao[] = [
  { id: 'animado', label: 'Animado', emoji: '😊', desc: 'Energia boa hoje' },
  { id: 'empolgado', label: 'Empolgado', emoji: '😄', desc: 'Motivação alta' },
  { id: 'motivado', label: 'Motivado', emoji: '🥰', desc: 'Vontade de ir' },
  { id: 'confiante', label: 'Confiante', emoji: '😎', desc: 'Seguro no que faço' },
  { id: 'determinado', label: 'Determinado', emoji: '💪', desc: 'Foco no que importa' },
  { id: 'grato', label: 'Grato', emoji: '❤️', desc: 'Reconhecimento no ar' },
  { id: 'em_paz', label: 'Em paz', emoji: '🧘', desc: 'Calma e equilíbrio' },
  { id: 'sobrecarregado', label: 'Sobrecarregado', emoji: '😵', desc: 'Muito acima do que aguento', negativa: true },
  { id: 'estressado', label: 'Estressado', emoji: '🤯', desc: 'Tensão alta', negativa: true },
  { id: 'desanimado', label: 'Desanimado', emoji: '😶', desc: 'Sem energia', negativa: true },
  { id: 'ansioso', label: 'Ansioso', emoji: '😣', desc: 'Preocupado ou inquieto', negativa: true },
  { id: 'irritado', label: 'Irritado', emoji: '😤', desc: 'Abalado ou impaciente', negativa: true },
  { id: 'decepcionado', label: 'Decepcionado', emoji: '😞', desc: 'Expectativa frustrada', negativa: true },
];

export const EMOCOES_IDS: EmocaoId[] = EMOCOES_TERMOMETRO.map((e) => e.id as EmocaoId);

/** Disparam aviso para RH / sócios / Daniel (identificado no registro). */
export const EMOCOES_ALERTA_GESTAO: string[] = [
  'sobrecarregado',
  'estressado',
  'desanimado',
  'ansioso',
  'irritado',
  'decepcionado',
  // legado
  'cansado',
  'frustrado',
  'triste',
];

export function isEmocaoId(v: string): v is EmocaoId {
  return (EMOCOES_IDS as readonly string[]).includes(v);
}

export function emocaoRequerAlertaGestao(emocao: string): boolean {
  return EMOCOES_ALERTA_GESTAO.includes(emocao);
}

export function emocaoEhNegativa(emocao: string): boolean {
  if (EMOCOES_ALERTA_GESTAO.includes(emocao)) return true;
  const meta = metaEmocao(emocao);
  return meta?.negativa === true;
}

export function metaEmocao(emocao: string): EmocaoOpcao | null {
  return (
    EMOCOES_TERMOMETRO.find((e) => e.id === emocao) ??
    EMOCOES_LEGADO.find((e) => e.id === emocao) ??
    null
  );
}

export function rotuloAlertasEmocionalResumido(): string {
  return 'sobrecarregado, estressado, desanimado, ansioso, irritado, decepcionado, cansado, frustrado ou triste';
}

export function ordenarRegistrosEmocional<T extends { emocao: string; registrado_em?: string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const na = emocaoEhNegativa(a.emocao) ? 0 : 1;
    const nb = emocaoEhNegativa(b.emocao) ? 0 : 1;
    if (na !== nb) return na - nb;
    const ta = a.registrado_em ? new Date(a.registrado_em).getTime() : 0;
    const tb = b.registrado_em ? new Date(b.registrado_em).getTime() : 0;
    return tb - ta;
  });
}
