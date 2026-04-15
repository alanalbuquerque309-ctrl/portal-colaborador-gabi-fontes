/**
 * Mapeia setor/cargo do colaborador → manual HTML em /manuais/.
 * Fallback: manual geral.
 */

const MANUAL_BASE = '/manuais';

export type ManualRef = { file: string; titulo: string };

/** Manual HTML obrigatório para todos os colaboradores (onboarding). */
export const MANUAL_GERAL_COLABORADOR: ManualRef = {
  file: 'Manual do colaborador (Geral).html',
  titulo: 'Manual geral (cultura e conduta)',
};

const GERAL = MANUAL_GERAL_COLABORADOR;

/** Normaliza texto para comparação. */
function n(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Retorna manual específico por setor ou null se só o geral se aplica.
 */
export function manualPorSetor(setor: string | null | undefined, role?: string | null): ManualRef | null {
  const r = (role || '').toLowerCase();
  if (r === 'gerente' || r === 'master') {
    return {
      file: 'Manual do Gerente.html',
      titulo: 'Manual de liderança e gestão',
    };
  }

  if (!setor?.trim()) return null;

  const t = n(setor);

  if (t.includes('cozinha') || t.includes('fabrica') || t.includes('fábrica') || t.includes('preparo')) {
    return { file: 'Manual do Auxiliar de Cozinha.html', titulo: 'Manual da cozinha' };
  }
  if (t.includes('atendimento')) {
    return { file: 'Manual do Atendimento.html', titulo: 'Manual de atendimento' };
  }
  if (t.includes('asg') || t.includes('limpeza') || t.includes('higiene')) {
    return { file: 'Manual do ASG.html', titulo: 'Manual ASG' };
  }
  if (t.includes('copa')) {
    return { file: 'Manual da Copa.html', titulo: 'Manual da copa' };
  }
  if (t.includes('estoque')) {
    return null;
  }
  if (t.includes('escritorio') || t.includes('escritório') || t.includes('rh') || t.includes('administr')) {
    return { file: 'Manual do ADM e RH.html', titulo: 'Manual ADM / RH' };
  }
  if (t.includes('supervis') || t.includes('marketing')) {
    return { file: 'Manual do Gerente.html', titulo: 'Manual de liderança (supervisão)' };
  }
  if (t.includes('motorista')) {
    return GERAL;
  }

  return null;
}

export function hrefManual(file: string): string {
  return `${MANUAL_BASE}/${encodeURIComponent(file)}`;
}
