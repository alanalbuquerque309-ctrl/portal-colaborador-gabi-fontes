import { nomeCoincide } from '@/lib/avaliacao-direta';

/** Nomes que veem o balão enquanto a rede inteira não estiver liberada. */
export const ANIVERSARIO_PREVIEW_NOMES = [
  'Alan Albuquerque',
  'Alan',
  'Gabriela Fontes',
  'Gabriela',
  'Daniel Brito Martins',
  'Daniel Brito',
  'Daniel Martins',
  'Daniel',
];

export function isAniversarioBalaoRedeAtivo(): boolean {
  const v = process.env.ANIVERSARIO_BALAO_REDE_ATIVO ?? '';
  return v === 'true' || v === '1';
}

export function isAniversarioBalaoPreviewAtivo(): boolean {
  if (isAniversarioBalaoRedeAtivo()) return false;
  const v = process.env.ANIVERSARIO_BALAO_PREVIEW ?? 'true';
  return v !== 'false' && v !== '0';
}

export function listAniversarioPreviewIds(): string[] {
  const raw = process.env.ANIVERSARIO_BALAO_PREVIEW_IDS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const ANIVERSARIO_PREVIEW_ROLES = new Set(['socio', 'admin']);

export function podeVerBalaoAniversario(opts: {
  colaboradorId: string;
  nome: string | null;
  role?: string | null;
}): boolean {
  if (isAniversarioBalaoRedeAtivo()) return true;
  const role = String(opts.role ?? '')
    .trim()
    .toLowerCase();
  // Liderança (Daniel, sócios, admin) vê sempre — independente do flag de preview na Vercel.
  if (ANIVERSARIO_PREVIEW_ROLES.has(role) || role === 'master') return true;
  if (!isAniversarioBalaoPreviewAtivo()) return false;
  if (listAniversarioPreviewIds().includes(opts.colaboradorId)) return true;
  const nome = opts.nome ?? '';
  return ANIVERSARIO_PREVIEW_NOMES.some((padrao) => nomeCoincide(nome, padrao));
}
