import { MURAL_GRUPO_MESQUITA_SLUGS } from '@/lib/mural-unidade-grupo';

export type CafeConectaGrupoConfig = {
  slug: string;
  label: string;
  unidade_slugs: readonly string[];
  ativo: boolean;
};

/** Grupos de sorteio — ativar novas unidades só alterando `ativo`. */
export const CAFE_CONECTA_GRUPOS: readonly CafeConectaGrupoConfig[] = [
  {
    slug: 'mesquita',
    label: 'Mesquita',
    unidade_slugs: MURAL_GRUPO_MESQUITA_SLUGS,
    ativo: true,
  },
  {
    slug: 'nova-iguacu',
    label: 'Nova Iguaçu',
    unidade_slugs: ['nova-iguacu'],
    ativo: false,
  },
  {
    slug: 'barra',
    label: 'Barra',
    unidade_slugs: ['barra'],
    ativo: false,
  },
] as const;

export function grupoCafeConectaPorSlug(slug: string | null | undefined): CafeConectaGrupoConfig | null {
  const s = String(slug ?? '').trim().toLowerCase();
  if (!s) return null;
  return CAFE_CONECTA_GRUPOS.find((g) => g.slug === s) ?? null;
}

export function gruposCafeConectaAtivos(): CafeConectaGrupoConfig[] {
  return CAFE_CONECTA_GRUPOS.filter((g) => g.ativo);
}

/** Grupo do colaborador a partir do slug da unidade cadastrada. */
export function grupoCafeConectaPorUnidadeSlug(unidadeSlug: string | null | undefined): CafeConectaGrupoConfig | null {
  const s = String(unidadeSlug ?? '').trim().toLowerCase();
  if (!s) return null;
  for (const g of CAFE_CONECTA_GRUPOS) {
    if (!g.ativo) continue;
    if ((g.unidade_slugs as readonly string[]).includes(s)) return g;
  }
  return null;
}
