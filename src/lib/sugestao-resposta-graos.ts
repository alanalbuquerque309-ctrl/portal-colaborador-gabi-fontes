import { podeParticiparGraosCafe } from '@/lib/roles';

/** Bônus da gestão além do 1 Grão do envio. */
export const GRAOS_RESPOSTA_SUGESTAO = [0, 3, 5, 9] as const;

/** Sugestões de quem não participa do programa Grãos (líderes, sócios, etc.). */
export const LABEL_ADMIN_SUGESTAO_SEM_GRAOS = 'Obrigado, vamos analisar';
export const MENSAGEM_SUGESTAO_SEM_GRAOS =
  'Obrigado pela ideia. Vamos analisar.';

export function autorElegivelGraosSugestao(role: string | null | undefined): boolean {
  return podeParticiparGraosCafe(role);
}

export const GRAOS_ENVIO_SUGESTAO = 1;

export type GraosRespostaSugestao = (typeof GRAOS_RESPOSTA_SUGESTAO)[number];

export type OpcaoRespostaSugestao = {
  graos: GraosRespostaSugestao;
  labelAdmin: string;
  labelColaborador: string;
};

/** Rótulos para exibição (inclui respostas legadas no banco, ex.: +7). */
export type RespostaSugestaoInfo = {
  graos: number;
  labelAdmin: string;
  labelColaborador: string;
};

export const OPCOES_RESPOSTA_SUGESTAO: OpcaoRespostaSugestao[] = [
  {
    graos: 0,
    labelAdmin: 'Sugestão reprovada',
    labelColaborador: 'Obrigado pelo envio. Desta vez a ideia não segue para análise.',
  },
  {
    graos: 3,
    labelAdmin: 'Boa participação',
    labelColaborador: 'Obrigado pela participação — registramos sua sugestão.',
  },
  {
    graos: 5,
    labelAdmin: 'Gostamos da ideia',
    labelColaborador: 'Gostamos da ideia — vamos considerar.',
  },
  {
    graos: 9,
    labelAdmin: 'Ótima ideia, vamos analisar',
    labelColaborador: 'Ótima ideia — vamos analisar com carinho.',
  },
];

/** Respostas antigas (7 Grãos) antes da escala 0/3/5/9. */
const LEGADO_RESPOSTA_7: RespostaSugestaoInfo = {
  graos: 7,
  labelAdmin: 'Gostamos — vamos analisar',
  labelColaborador: 'Gostamos da sua sugestão — vamos analisar com carinho.',
};

export function graosRespostaSugestaoValidos(v: unknown): v is GraosRespostaSugestao {
  return typeof v === 'number' && (GRAOS_RESPOSTA_SUGESTAO as readonly number[]).includes(v);
}

export function opcaoRespostaSugestao(graos: number | null | undefined): RespostaSugestaoInfo | null {
  if (graos == null) return null;
  const op = OPCOES_RESPOSTA_SUGESTAO.find((o) => o.graos === graos);
  if (op) return op;
  if (graos === 7) return LEGADO_RESPOSTA_7;
  return null;
}

export function rotuloRespostaAdmin(graos: number | null | undefined): string {
  const op = opcaoRespostaSugestao(graos);
  if (!op) return 'Respondido';
  return `${op.labelAdmin} (+${op.graos} Grãos)`;
}

export function mensagemRespostaColaborador(
  graosRespostaBonus: number | null | undefined,
  respondido: boolean,
  opts?: { autorParticipaGraos?: boolean }
): string | null {
  if (!respondido) return null;
  if (opts?.autorParticipaGraos === false) return MENSAGEM_SUGESTAO_SEM_GRAOS;
  const op = opcaoRespostaSugestao(graosRespostaBonus ?? 0);
  if (!op) return 'Recebemos sua sugestão — obrigado!';
  const bonus = graosRespostaBonus ?? 0;
  const extra = bonus > 0 ? ` (+${bonus} Grãos de bônus)` : '';
  return `${op.labelColaborador}${extra}`;
}

export function rotuloRespostaAdminItem(
  graosRespostaBonus: number | null | undefined,
  autorParticipaGraos: boolean
): string {
  if (!autorParticipaGraos) return LABEL_ADMIN_SUGESTAO_SEM_GRAOS;
  return rotuloRespostaAdmin(graosRespostaBonus);
}

export function graosTotaisSugestao(bonus: number | null | undefined): number {
  return GRAOS_ENVIO_SUGESTAO + Math.max(0, bonus ?? 0);
}
