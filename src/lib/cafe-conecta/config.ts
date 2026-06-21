import { MURAL_GRUPO_MESQUITA_SLUGS } from '@/lib/mural-unidade-grupo';

export type CafeConectaGrupoConfig = {
  slug: string;
  label: string;
  unidade_slugs: readonly string[];
  /** Grupo visível no portal (card, perfil, elegíveis no admin). */
  ativo: boolean;
  /** Permite sortear/publicar e dispara alerta de quarta. */
  sorteio_liberado: boolean;
};

/** Grupos de sorteio — novas unidades: `ativo: true`; sorteio quando `sorteio_liberado: true`. */
export const CAFE_CONECTA_GRUPOS: readonly CafeConectaGrupoConfig[] = [
  {
    slug: 'mesquita',
    label: 'Mesquita',
    unidade_slugs: MURAL_GRUPO_MESQUITA_SLUGS,
    ativo: true,
    sorteio_liberado: true,
  },
  {
    slug: 'nova-iguacu',
    label: 'Nova Iguaçu',
    unidade_slugs: ['nova-iguacu'],
    ativo: true,
    sorteio_liberado: false,
  },
  {
    slug: 'barra',
    label: 'Barra',
    unidade_slugs: ['barra'],
    ativo: true,
    sorteio_liberado: false,
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

export function gruposCafeConectaComSorteio(): CafeConectaGrupoConfig[] {
  return CAFE_CONECTA_GRUPOS.filter((g) => g.ativo && g.sorteio_liberado);
}

export function grupoPermiteSorteioCafeConecta(grupo: CafeConectaGrupoConfig): boolean {
  return grupo.ativo && grupo.sorteio_liberado;
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
