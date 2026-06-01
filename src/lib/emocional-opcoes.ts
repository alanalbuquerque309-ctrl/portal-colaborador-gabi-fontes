/** Opções do termômetro de emoções (colaboradores). */

export type EmocaoId =
  | 'feliz'
  | 'tranquilo'
  | 'neutro'
  | 'cansado'
  | 'frustrado'
  | 'triste';

export type EmocaoOpcao = {
  id: EmocaoId;
  label: string;
  emoji: string;
  desc: string;
};

export const EMOCOES_TERMOMETRO: EmocaoOpcao[] = [
  { id: 'feliz', label: 'Feliz', emoji: '😊', desc: 'Ótimo dia!' },
  { id: 'tranquilo', label: 'Tranquilo', emoji: '😌', desc: 'Tudo bem' },
  { id: 'neutro', label: 'Neutro', emoji: '😐', desc: 'Sem novidades' },
  { id: 'cansado', label: 'Cansado', emoji: '😓', desc: 'Preciso de um respiro' },
  { id: 'frustrado', label: 'Frustrado', emoji: '😤', desc: 'Não está fácil' },
  { id: 'triste', label: 'Triste', emoji: '😢', desc: 'Dia pesado' },
];

export const EMOCOES_IDS: EmocaoId[] = EMOCOES_TERMOMETRO.map((e) => e.id);

/** Disparam aviso discreto para RH / sócios / Daniel (não é anônimo para quem gerencia). */
export const EMOCOES_ALERTA_GESTAO: EmocaoId[] = ['cansado', 'frustrado', 'triste'];

export function isEmocaoId(v: string): v is EmocaoId {
  return (EMOCOES_IDS as readonly string[]).includes(v);
}

export function emocaoRequerAlertaGestao(emocao: string): boolean {
  return (EMOCOES_ALERTA_GESTAO as readonly string[]).includes(emocao);
}

export function metaEmocao(emocao: string): EmocaoOpcao | null {
  return EMOCOES_TERMOMETRO.find((e) => e.id === emocao) ?? null;
}
