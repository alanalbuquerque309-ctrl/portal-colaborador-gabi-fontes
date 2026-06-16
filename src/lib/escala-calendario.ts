/**
 * Geração de dias trabalho/folga por regime (junho e demais meses).
 * Domingos de junho/2026 documentados em FOLGAS DE DOMINGO JUNHO.docx.
 */

export type TipoEscala = '12x36' | '6x1' | '5x2';

export type DiaEscalaGerado = {
  data: string;
  folga: boolean;
  observacao: string | null;
};

const DOMINGOS_JUNHO_2026 = ['2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28'];

/** 0=dom … 6=sáb (Date.getDay()). */
export type ConfigEscala = {
  tipo: TipoEscala;
  /** Dias da semana em folga fixa (ex.: [1,2] = seg e ter). */
  folgaDiasSemana: number[];
  /** Domingos extras em folga (YYYY-MM-DD), além do padrão. */
  domingosFolgaExtras?: string[];
  /** 6x1 com folga só no domingo (ignora folgaDiasSemana se true). */
  folgaDomingoSemanal?: boolean;
};

export function normalizarNomeEscala(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function diasDoMes(ano: number, mes: number): string[] {
  const ultimo = new Date(ano, mes, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= ultimo; d++) {
    const mm = String(mes).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    out.push(`${ano}-${mm}-${dd}`);
  }
  return out;
}

export function gerarMes(config: ConfigEscala, ano: number, mes: number): DiaEscalaGerado[] {
  const extras = new Set(config.domingosFolgaExtras ?? []);
  const folgaSemana = new Set(config.folgaDiasSemana);

  return diasDoMes(ano, mes).map((dataIso) => {
    const d = new Date(`${dataIso}T12:00:00`);
    const dow = d.getDay();

    let folga = false;

    if (config.tipo === '6x1' && config.folgaDomingoSemanal) {
      folga = dow === 0;
    } else if (folgaSemana.has(dow)) {
      folga = true;
    }

    if (extras.has(dataIso)) folga = true;

    return {
      data: dataIso,
      folga,
      observacao: folga ? 'Folga' : null,
    };
  });
}

/** Perfis do documento «Folgas de domingo — junho». */
export const ESCALAS_DOCUMENTO_JUNHO_2026: Array<{
  chavesNome: string[];
  unidadeSlug: string;
  setor?: string;
  config: ConfigEscala;
}> = [
  {
    chavesNome: ['miguel'],
    unidadeSlug: 'mesquita',
    config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-21'] },
  },
  {
    chavesNome: ['ana luiza'],
    unidadeSlug: 'barra',
    config: { tipo: '5x2', folgaDiasSemana: [2, 3], domingosFolgaExtras: ['2026-06-07', '2026-06-21'] },
  },
  {
    chavesNome: ['leonardo'],
    unidadeSlug: 'mesquita',
    config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-28'] },
  },
  {
    chavesNome: ['guilherme'],
    unidadeSlug: 'mesquita',
    config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-28'] },
  },
  {
    chavesNome: ['bianca'],
    unidadeSlug: 'mesquita',
    config: { tipo: '5x2', folgaDiasSemana: [1, 2], domingosFolgaExtras: ['2026-06-07', '2026-06-21'] },
  },
  {
    chavesNome: ['marcella'],
    unidadeSlug: 'nova-iguacu',
    config: { tipo: '5x2', folgaDiasSemana: [3, 4], domingosFolgaExtras: ['2026-06-14', '2026-06-28'] },
  },
  {
    chavesNome: ['gladys'],
    unidadeSlug: 'mesquita',
    config: { tipo: '6x1', folgaDiasSemana: [4], domingosFolgaExtras: ['2026-06-07', '2026-06-21'] },
  },
  {
    chavesNome: ['ledilma'],
    unidadeSlug: 'mesquita',
    config: { tipo: '6x1', folgaDiasSemana: [3], domingosFolgaExtras: ['2026-06-07', '2026-06-28'] },
  },
  {
    chavesNome: ['veronica'],
    unidadeSlug: 'mesquita',
    config: { tipo: '6x1', folgaDiasSemana: [4], domingosFolgaExtras: ['2026-06-21'] },
  },
  {
    chavesNome: ['luciana'],
    unidadeSlug: 'mesquita',
    config: { tipo: '6x1', folgaDiasSemana: [4], domingosFolgaExtras: ['2026-06-21'] },
  },
  {
    chavesNome: ['tiago ventura', 'tiago'],
    unidadeSlug: 'administrativo',
    setor: 'Administração',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
  {
    chavesNome: ['sabrina'],
    unidadeSlug: 'fabrica',
    setor: 'Fábrica de doces',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
  {
    chavesNome: ['luis henrique', 'luiz henrique'],
    unidadeSlug: 'fabrica',
    setor: 'Fábrica de doces',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
  {
    chavesNome: ['florismar'],
    unidadeSlug: 'mesquita',
    setor: 'Atendimento',
    config: { tipo: '6x1', folgaDiasSemana: [], folgaDomingoSemanal: true, domingosFolgaExtras: DOMINGOS_JUNHO_2026 },
  },
];

const MAP_DIA_ABREV: Record<string, number> = {
  dom: 0,
  domingo: 0,
  seg: 1,
  segunda: 1,
  ter: 2,
  terca: 2,
  qua: 3,
  quarta: 3,
  qui: 4,
  quinta: 4,
  sex: 5,
  sexta: 5,
  sab: 6,
  sábado: 6,
  sabado: 6,
};

/** Converte `escala_folga_dias` do cadastro (ex.: "seg,ter" ou "dom") em dias da semana. */
export function parseFolgaDiasTexto(texto: string | null | undefined): {
  folgaDiasSemana: number[];
  folgaDomingoSemanal: boolean;
} {
  const bruto = String(texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!bruto) return { folgaDiasSemana: [], folgaDomingoSemanal: false };
  if (bruto === 'dom' || bruto === 'domingo') {
    return { folgaDiasSemana: [], folgaDomingoSemanal: true };
  }
  const folgaDiasSemana: number[] = [];
  for (const parte of bruto.split(/[,;\s]+/)) {
    const p = parte.trim();
    if (!p) continue;
    const n = MAP_DIA_ABREV[p];
    if (n !== undefined && !folgaDiasSemana.includes(n)) folgaDiasSemana.push(n);
  }
  return { folgaDiasSemana, folgaDomingoSemanal: false };
}

export function folgaDiasParaTexto(folgaDiasSemana: number[], folgaDomingoSemanal?: boolean): string {
  const map: Record<number, string> = {
    0: 'dom',
    1: 'seg',
    2: 'ter',
    3: 'qua',
    4: 'qui',
    5: 'sex',
    6: 'sab',
  };
  if (folgaDomingoSemanal) return 'dom';
  return folgaDiasSemana
    .map((d) => map[d] ?? '')
    .filter(Boolean)
    .join(',');
}
