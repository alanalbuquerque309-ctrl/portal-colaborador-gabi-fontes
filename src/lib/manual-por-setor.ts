/**
 * Mapeia setor/cargo do colaborador → manual HTML em /manuais/ (servido por `app/manuais/[[...path]]/route.ts`, pasta `manuals/` na raiz).
 * Fallback: manual geral.
 */

const MANUAL_BASE = '/manuais';

/**
 * Incremente ao alterar qualquer HTML em `manuals/` (raiz do projeto) para obrigar browser/CDN
 * a buscar o ficheiro novo (evita ver manual antigo em cache).
 */
export const MANUAL_ASSET_VERSION = '20260417-11';

export type ManualRef = { file: string; titulo: string };

/** Manual HTML obrigatório para todos os colaboradores (onboarding). */
export const MANUAL_GERAL_COLABORADOR: ManualRef = {
  file: 'Manual do colaborador (Geral).html',
  titulo: 'Manual do Colaborador da Cultura',
};

const GERAL = MANUAL_GERAL_COLABORADOR;

/** Normaliza texto para comparação. */
function n(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Junta setor e cargo para reconhecer o manual mesmo quando só um dos campos está preenchido. */
function textoSetorECargo(setor: string | null | undefined, cargo: string | null | undefined): string {
  const parts = [setor, cargo]
    .map((s) => (s != null ? String(s).trim() : ''))
    .filter(Boolean);
  return parts.join(' ');
}

function isEstoque(t: string): boolean {
  return (
    t.includes('estoque') ||
    t.includes('estoquista') ||
    t.includes('deposito') ||
    t.includes('almoxarifado') ||
    t.includes('logistica') ||
    t.includes('expedicao') ||
    t.includes('armazem') ||
    /\bcd\b/.test(t)
  );
}

/**
 * Retorna manual específico por setor ou null se só o geral se aplica.
 * `cargo` ajuda quando o cadastro só preenche o cargo (ex.: Estoquista) ou o setor vem como CD/depósito.
 */
export function manualPorSetor(
  setor: string | null | undefined,
  role?: string | null,
  cargo?: string | null
): ManualRef | null {
  const r = (role || '').toLowerCase();
  if (r === 'gerente' || r === 'master') {
    return {
      file: 'Manual do Gerente.html',
      titulo: 'Manual de liderança e gestão',
    };
  }

  const combined = textoSetorECargo(setor, cargo);
  if (!combined.trim()) return null;

  const t = n(combined);

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
  if (isEstoque(t)) {
    return { file: 'Manual do Estoquista.html', titulo: 'Manual de estoque' };
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
  const path = `${MANUAL_BASE}/${encodeURIComponent(file)}`;
  const v = encodeURIComponent(MANUAL_ASSET_VERSION);
  return `${path}?v=${v}`;
}

const MANUAIS_PERMITIDOS = new Set<string>([
  MANUAL_GERAL_COLABORADOR.file,
  'Manual do Gerente.html',
  'Manual do Auxiliar de Cozinha.html',
  'Manual do Atendimento.html',
  'Manual do ASG.html',
  'Manual da Copa.html',
  'Manual do Estoquista.html',
  'Manual do ADM e RH.html',
]);

/** Evita path traversal ao abrir manual dentro do portal. */
export function isManualArquivoPermitido(file: string): boolean {
  const f = String(file ?? '').trim();
  if (!f || f.includes('..') || f.includes('/') || f.includes('\\')) return false;
  return MANUAIS_PERMITIDOS.has(f);
}

/** Abre o HTML no layout do portal (menu inferior e voltar). */
export function hrefManualNoPortal(file: string, titulo?: string): string {
  const params = new URLSearchParams({ file });
  if (titulo?.trim()) params.set('titulo', titulo.trim());
  return `/portal/manual?${params.toString()}`;
}
