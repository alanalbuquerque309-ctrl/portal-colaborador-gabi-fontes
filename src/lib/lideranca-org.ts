import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { slugUnidadeAdministrativo } from '@/lib/tenant/org-catalog';

/** Setor legado — tratar como CD em vínculos e exibição. */
export const SETOR_ESTOQUE_LEGADO = 'Estoque';

/** Setores operacionais de cada filial (loja Mesquita, Barra, Nova Iguaçu). */
export const SETORES_LOJA_FILIAL = [
  'Cozinha loja',
  'Atendimento',
  'Copa',
  'Caixa',
  'ASG',
] as const;

/** Setores da unidade Fábrica. */
export const SETORES_FABRICA = ['Fábrica de preparos', 'Fábrica de doces'] as const;

/** Backoffice transversal (Daniel) — CD substitui Estoque. */
export const SETORES_ADMINISTRACAO_EMPRESA = [
  'Administração',
  'Escritório',
  'CD',
  'Motorista',
  'RH',
] as const;

const SLUGS_LOJA = ['mesquita', 'barra', 'nova-iguacu'] as const;

export function normalizarSetorOrganizacional(setor: string | null | undefined): string {
  const s = String(setor ?? '').trim();
  if (!s) return '';
  if (s === SETOR_ESTOQUE_LEGADO) return 'CD';
  return s;
}

/** Valores aceitos no banco para um setor canónico (ex.: CD inclui legado Estoque). */
export function setoresDbEquivalentes(setor: string): string[] {
  const canon = normalizarSetorOrganizacional(setor);
  if (!canon) return [];
  if (canon === 'CD') return ['CD', SETOR_ESTOQUE_LEGADO];
  return [canon];
}

export function ehUnidadeLoja(slug: string | null | undefined): boolean {
  return SLUGS_LOJA.includes(String(slug ?? '') as (typeof SLUGS_LOJA)[number]);
}

export function ehUnidadeFabrica(slug: string | null | undefined): boolean {
  return String(slug ?? '') === 'fabrica';
}

export function ehUnidadeAdministrativo(slug: string | null | undefined): boolean {
  return String(slug ?? '') === slugUnidadeAdministrativo();
}

/** Título do bloco `*` (gerência) conforme o tipo de unidade. */
export function rotuloGerenciaUnidade(slug: string | null | undefined): string {
  if (ehUnidadeAdministrativo(slug)) return 'Administração da empresa';
  if (ehUnidadeFabrica(slug)) return 'Gerência da fábrica';
  if (ehUnidadeLoja(slug)) return 'Gerência da loja';
  return 'Gerência da unidade';
}

/** Texto de apoio sob o bloco de gerência. */
export function descricaoGerenciaUnidade(slug: string | null | undefined): string | null {
  if (ehUnidadeLoja(slug)) {
    return 'Responsáveis pela filial: cozinha, atendimento, copa, caixa e ASG. O plantão 12x36 (dias pares/ímpares) é configurado neste bloco.';
  }
  if (ehUnidadeFabrica(slug)) {
    return 'Use os blocos «Fábrica de preparos» e «Fábrica de doces» abaixo para líderes por área.';
  }
  if (ehUnidadeAdministrativo(slug)) {
    return 'Daniel: administrador da empresa. Os setores Escritório, CD, Motorista e RH ficam listados abaixo.';
  }
  return null;
}

/** Texto curto sob títulos de setor na aba Admin. */
export function descricaoSetorAdmin(setor: string): string | null {
  if (setor === 'CD') return 'Centro de distribuição (unificado com o antigo «Estoque»).';
  if (setor === 'Administração') {
    return 'Engloba Escritório, CD, Motorista e RH na gestão da empresa.';
  }
  if (setor === 'Fábrica de preparos') {
    return 'Mesquita — Joyce e Silvia (mesma liderança da loja).';
  }
  if (setor === 'Fábrica de doces') return 'Sabrina e Henrique.';
  return null;
}

/** Ordem e lista de setores exibidos na aba Admin por unidade. */
export function setoresExibicaoPorUnidade(slug: string): readonly string[] {
  if (ehUnidadeFabrica(slug)) {
    return [...SETORES_FABRICA, ...SETORES_ADMINISTRACAO_EMPRESA, 'Marketing', 'Supervisão'];
  }
  if (ehUnidadeAdministrativo(slug)) {
    return [...SETORES_ADMINISTRACAO_EMPRESA, 'Marketing', 'Supervisão'];
  }
  if (ehUnidadeLoja(slug)) {
    return [...SETORES_LOJA_FILIAL, ...SETORES_ADMINISTRACAO_EMPRESA, 'Marketing', 'Supervisão'];
  }
  return [...SETORES_LOJA_FILIAL, ...SETORES_FABRICA, ...SETORES_ADMINISTRACAO_EMPRESA, 'Marketing', 'Supervisão'];
}

export function agruparLinhasPorSetorExibicao(
  linhas: Array<{ setor: string; [key: string]: unknown }>,
  unidadeSlug: string
): Map<string, typeof linhas> {
  const map = new Map<string, typeof linhas>();
  for (const setor of setoresExibicaoPorUnidade(unidadeSlug)) {
    map.set(setor, []);
  }
  for (const l of linhas) {
    if (l.setor === SETOR_TODOS_NA_UNIDADE) continue;
    const canon = normalizarSetorOrganizacional(l.setor);
    const bucket = map.get(canon) ?? [];
    bucket.push(l);
    map.set(canon, bucket);
  }
  return map;
}
