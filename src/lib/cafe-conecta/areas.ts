import { setorEstoqueLegado } from '@/lib/tenant/org-catalog';

/** Área operacional para priorizar setores diferentes no sorteio. */
export type CafeConectaArea =
  | 'loja'
  | 'fabrica_doces'
  | 'fabrica_prep'
  | 'cd'
  | 'administrativo'
  | 'asg'
  | 'motorista'
  | 'outro';

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function areaCafeConectaDeSetor(setor: string | null | undefined): CafeConectaArea {
  const s = norm(String(setor ?? ''));
  if (!s) return 'outro';
  if (s === norm(setorEstoqueLegado()) || s === 'cd') return 'cd';
  if (s.includes('fabrica de doces') || s.includes('doces')) return 'fabrica_doces';
  if (s.includes('fabrica de prepar') || s.includes('preparos') || s.includes('prep')) return 'fabrica_prep';
  if (s.includes('motorista')) return 'motorista';
  if (s === 'asg') return 'asg';
  if (s.includes('administr') || s.includes('escritorio') || s === 'rh') return 'administrativo';
  if (
    s.includes('cozinha') ||
    s.includes('atendimento') ||
    s.includes('copa') ||
    s.includes('caixa') ||
    s.includes('loja')
  ) {
    return 'loja';
  }
  return 'outro';
}

export function rotuloAreaCafeConecta(area: CafeConectaArea): string {
  switch (area) {
    case 'loja':
      return 'Loja';
    case 'fabrica_doces':
      return 'Fábrica de Doces';
    case 'fabrica_prep':
      return 'Fábrica de Prep';
    case 'cd':
      return 'CD';
    case 'administrativo':
      return 'Administrativo';
    case 'asg':
      return 'ASG';
    case 'motorista':
      return 'Motorista';
    default:
      return 'Equipe';
  }
}

/** Rótulo curto para card (setor cadastrado ou área). */
export function rotuloSetorCafeConecta(setor: string | null | undefined): string {
  const t = String(setor ?? '').trim();
  if (t) return t;
  return rotuloAreaCafeConecta(areaCafeConectaDeSetor(setor));
}
