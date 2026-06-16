/** Público-alvo de um aviso no mural (Admin → Avisos). */

export type PublicoAvisoKey =
  | 'todos'
  | 'adm'
  | 'fabrica-doce'
  | 'mesquita'
  | 'nova-iguacu'
  | 'barra';

export type PublicoAvisoOpcao = {
  key: PublicoAvisoKey;
  label: string;
  hint: string;
};

export const PUBLICOS_AVISO: PublicoAvisoOpcao[] = [
  { key: 'todos', label: 'Todos', hint: 'Toda a rede' },
  {
    key: 'adm',
    label: 'Adm',
    hint: 'Administrativo, RH, estoque e motorista',
  },
  {
    key: 'fabrica-doce',
    label: 'Fábrica doce',
    hint: 'Unidade Fábrica · setor Fábrica de doces',
  },
  {
    key: 'mesquita',
    label: 'Mesquita',
    hint: 'Loja Mesquita + Fábrica de preparos',
  },
  { key: 'nova-iguacu', label: 'Nova Iguaçu', hint: 'Loja Nova Iguaçu' },
  { key: 'barra', label: 'Barra', hint: 'Loja Barra' },
];

const PUBLICO_KEYS = new Set<string>(PUBLICOS_AVISO.map((p) => p.key));

function normTxt(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Setores que entram no público Adm (além da unidade administrativo). */
const SETORES_PUBLICO_ADM = new Set(
  ['Administração', 'RH', 'Motorista', 'CD', 'Escritório'].map((s) => normTxt(s))
);

const SETOR_FABRICA_DOCES = normTxt('Fábrica de doces');
const SETOR_FABRICA_PREPAROS = normTxt('Fábrica de preparos');

export function isPublicoAvisoKey(value: string | null | undefined): value is PublicoAvisoKey {
  return PUBLICO_KEYS.has(String(value ?? '').trim());
}

export function labelPublicoAviso(key: string | null | undefined): string {
  const k = String(key ?? '').trim() as PublicoAvisoKey;
  return PUBLICOS_AVISO.find((p) => p.key === k)?.label ?? '—';
}

/** Slug gravado em `unidades` só para referência/legado na linha do aviso. */
export function slugUnidadeReferenciaPublico(publico: PublicoAvisoKey): string {
  const map: Record<PublicoAvisoKey, string> = {
    todos: 'matriz',
    adm: 'administrativo',
    'fabrica-doce': 'fabrica',
    mesquita: 'mesquita',
    'nova-iguacu': 'nova-iguacu',
    barra: 'barra',
  };
  return map[publico];
}

/** Avisos antigos (sem coluna publico_alvo) inferidos pelo slug da unidade. */
export function publicoLegacyFromUnidadeSlug(unidadeSlug: string | null | undefined): PublicoAvisoKey {
  const s = normTxt(unidadeSlug);
  if (s === 'matriz') return 'todos';
  if (s === 'administrativo') return 'adm';
  if (s === 'fabrica') return 'fabrica-doce';
  if (s === 'mesquita') return 'mesquita';
  if (s === 'nova-iguacu') return 'nova-iguacu';
  if (s === 'barra') return 'barra';
  return 'todos';
}

export function resolverPublicoAviso(
  publicoAlvo: string | null | undefined,
  unidadeSlug: string | null | undefined
): PublicoAvisoKey {
  if (isPublicoAvisoKey(publicoAlvo)) return publicoAlvo;
  return publicoLegacyFromUnidadeSlug(unidadeSlug);
}

export type ColaboradorPublicoAviso = {
  unidade_slug: string;
  setor: string | null;
};

export function colaboradorRecebeAvisoPublico(
  colaborador: ColaboradorPublicoAviso,
  publico: PublicoAvisoKey
): boolean {
  const slug = normTxt(colaborador.unidade_slug);
  const setor = normTxt(colaborador.setor);

  switch (publico) {
    case 'todos':
      return true;
    case 'adm':
      return slug === 'administrativo' || SETORES_PUBLICO_ADM.has(setor);
    case 'fabrica-doce':
      return slug === 'fabrica' && setor === SETOR_FABRICA_DOCES;
    case 'mesquita':
      return slug === 'mesquita' || (slug === 'fabrica' && setor === SETOR_FABRICA_PREPAROS);
    case 'nova-iguacu':
      return slug === 'nova-iguacu';
    case 'barra':
      return slug === 'barra';
    default:
      return false;
  }
}
