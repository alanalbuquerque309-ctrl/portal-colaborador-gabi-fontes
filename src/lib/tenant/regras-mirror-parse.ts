import type { RegraAvaliacaoDireta } from '@/lib/config-avaliacao-direta';
import type { RegraLiderancaOperacional } from '@/lib/config-lideranca-operacional';

function nomesValidos(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'string' && n.trim().length > 0);
}

/** Valida JSON do espelho 062; devolve null se inválido ou vazio. */
export function parseRegrasLiderancaMirror(raw: unknown): RegraLiderancaOperacional[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: RegraLiderancaOperacional[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    if (!nomesValidos(o.lideres_nomes)) return null;
    const lideres_nomes = o.lideres_nomes as string[];

    if (o.tipo === 'unidade_todos' && typeof o.unidade_slug === 'string') {
      out.push({ tipo: 'unidade_todos', unidade_slug: o.unidade_slug, lideres_nomes });
      continue;
    }
    if (
      o.tipo === 'unidade_setor' &&
      typeof o.unidade_slug === 'string' &&
      typeof o.setor === 'string'
    ) {
      out.push({ tipo: 'unidade_setor', unidade_slug: o.unidade_slug, setor: o.setor, lideres_nomes });
      continue;
    }
    if (o.tipo === 'setor_todas_unidades' && typeof o.setor === 'string') {
      out.push({ tipo: 'setor_todas_unidades', setor: o.setor, lideres_nomes });
      continue;
    }
    return null;
  }

  return out.length > 0 ? out : null;
}

/** Valida JSON do espelho 062; devolve null se inválido ou vazio. */
export function parseRegrasAvaliacaoDiretaMirror(raw: unknown): RegraAvaliacaoDireta[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: RegraAvaliacaoDireta[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const o = item as Record<string, unknown>;
    if (!nomesValidos(o.avaliadores_nomes) || !nomesValidos(o.colaboradores_nomes)) return null;
    out.push({
      avaliadores_nomes: o.avaliadores_nomes as string[],
      colaboradores_nomes: o.colaboradores_nomes as string[],
      exclusivo: o.exclusivo === true ? true : undefined,
    });
  }

  return out.length > 0 ? out : null;
}
