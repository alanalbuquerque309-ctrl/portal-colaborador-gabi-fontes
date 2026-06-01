/** Slugs que compõem o mesmo “mural de loja” de Mesquita (loja + fábricas + administrativo). */
export const MURAL_GRUPO_MESQUITA_SLUGS = ['mesquita', 'fabrica', 'administrativo'] as const;

const ROTULO_POR_SLUG: Record<string, string> = {
  mesquita: 'Mesquita',
  fabrica: 'Fábricas',
  administrativo: 'Administrativo',
  barra: 'Barra',
  'nova-iguacu': 'Nova Iguaçu',
};

/** Unidades que entram no mesmo ranking de mural visível ao colaborador. */
export function slugsDoGrupoMural(unidadeSlug: string | null | undefined): string[] {
  const s = String(unidadeSlug ?? '').trim().toLowerCase();
  if (!s) return [];
  if ((MURAL_GRUPO_MESQUITA_SLUGS as readonly string[]).includes(s)) {
    return [...MURAL_GRUPO_MESQUITA_SLUGS];
  }
  return [s];
}

export function rotuloGrupoMural(unidadeSlug: string | null | undefined): string {
  const slugs = slugsDoGrupoMural(unidadeSlug);
  if (slugs.length > 1 && slugs.includes('mesquita')) return 'Mesquita';
  const s = String(unidadeSlug ?? '').trim().toLowerCase();
  return ROTULO_POR_SLUG[s] ?? (s ? s : 'Unidade');
}
