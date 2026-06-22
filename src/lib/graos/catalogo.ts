import type { SupabaseClient } from '@supabase/supabase-js';
import { GRAOS_CENTAVOS_POR_GRAO } from '@/lib/graos/constants';

/** Taxa usada no seed original (migration 044): preço R$ = graos × isto. */
export const GRAOS_CATALOGO_PRECO_BASE_CENTAVOS = 35;

export type CatalogoGraosRow = {
  id: string;
  nome: string;
  graos?: number | null;
  preco_centavos?: number | null;
  ativo?: boolean | null;
};

export type CatalogoGraosItem = {
  id: string;
  nome: string;
  graos: number;
  preco_centavos: number;
  ativo: boolean;
};

/** Grãos cobrados no resgate para manter o preço em R$ quando muda GRAOS_CENTAVOS_POR_GRAO. */
export function graosCustoCatalogo(precoCentavos: number): number {
  if (precoCentavos <= 0) return 1;
  return Math.max(1, Math.ceil(precoCentavos / GRAOS_CENTAVOS_POR_GRAO));
}

export function resolverPrecoCentavosCatalogo(row: CatalogoGraosRow): number {
  const preco = Number(row.preco_centavos ?? 0);
  if (preco > 0) return preco;
  const legado = Number(row.graos ?? 0);
  if (legado > 0) return legado * GRAOS_CATALOGO_PRECO_BASE_CENTAVOS;
  return 0;
}

export function normalizarItemCatalogoGraos(row: CatalogoGraosRow): CatalogoGraosItem {
  const preco_centavos = resolverPrecoCentavosCatalogo(row);
  return {
    id: String(row.id),
    nome: String(row.nome ?? ''),
    preco_centavos,
    graos: graosCustoCatalogo(preco_centavos),
    ativo: row.ativo !== false,
  };
}

export function complementoCentavosResgate(complementoGraos: number): number {
  return Math.round(Math.max(0, complementoGraos) * GRAOS_CENTAVOS_POR_GRAO);
}

const SELECTS_CATALOGO = [
  'id, nome, graos, preco_centavos, ativo',
  'id, nome, graos, ativo',
] as const;

function erroColunaPrecoCentavos(msg: string): boolean {
  return /preco_centavos|column .* does not exist|schema cache/i.test(msg);
}

export async function listarCatalogoGraosAtivo(
  supabase: SupabaseClient
): Promise<CatalogoGraosItem[]> {
  let raw: Record<string, unknown>[] | null = null;

  for (const sel of SELECTS_CATALOGO) {
    const res = await supabase
      .from('graos_catalogo')
      .select(sel)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (!res.error) {
      raw = (res.data ?? []) as unknown as Record<string, unknown>[];
      break;
    }
    if (!erroColunaPrecoCentavos(res.error.message)) {
      throw new Error(res.error.message);
    }
  }

  if (!raw) return [];

  return raw.map((row) =>
    normalizarItemCatalogoGraos({
      id: String(row.id),
      nome: String(row.nome ?? ''),
      graos: row.graos != null ? Number(row.graos) : null,
      preco_centavos: row.preco_centavos != null ? Number(row.preco_centavos) : null,
      ativo: row.ativo as boolean | null | undefined,
    })
  );
}

export async function buscarItensCatalogoGraosPorIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, CatalogoGraosItem>> {
  if (ids.length === 0) return new Map();

  let raw: Record<string, unknown>[] | null = null;

  for (const sel of SELECTS_CATALOGO) {
    const res = await supabase.from('graos_catalogo').select(sel).in('id', ids);

    if (!res.error) {
      raw = (res.data ?? []) as unknown as Record<string, unknown>[];
      break;
    }
    if (!erroColunaPrecoCentavos(res.error.message)) {
      throw new Error(res.error.message);
    }
  }

  const out = new Map<string, CatalogoGraosItem>();
  for (const row of raw ?? []) {
    const item = normalizarItemCatalogoGraos({
      id: String(row.id),
      nome: String(row.nome ?? ''),
      graos: row.graos != null ? Number(row.graos) : null,
      preco_centavos: row.preco_centavos != null ? Number(row.preco_centavos) : null,
      ativo: row.ativo as boolean | null | undefined,
    });
    out.set(item.id, item);
  }
  return out;
}
