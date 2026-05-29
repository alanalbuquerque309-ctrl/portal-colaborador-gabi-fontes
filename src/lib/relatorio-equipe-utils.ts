import type { LinhaDiariaRelatorio } from '@/components/portal/RelatorioAvaliacoesPorSetor';

export type FiltroOrigemEquipe = 'todos' | 'gerente' | 'rh';

export function formatarSemanaCurta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}`;
}

export function rotuloAvaliador(l: LinhaDiariaRelatorio): string {
  if (l.origem_visita_rh) return 'Visita RH';
  return l.avaliador_nome?.trim() || 'Gerente';
}

export function filtrarLinhasEquipe(
  linhas: LinhaDiariaRelatorio[],
  filtroOrigem: FiltroOrigemEquipe,
  busca: string
): LinhaDiariaRelatorio[] {
  const q = busca.trim().toLowerCase();
  let filtradas = linhas;
  if (filtroOrigem === 'gerente') {
    filtradas = filtradas.filter((l) => !l.origem_visita_rh);
  } else if (filtroOrigem === 'rh') {
    filtradas = filtradas.filter((l) => l.origem_visita_rh);
  }
  if (q) {
    filtradas = filtradas.filter((l) => {
      const nome = String(l.colaborador_nome ?? '').toLowerCase();
      const aval = rotuloAvaliador(l).toLowerCase();
      return nome.includes(q) || aval.includes(q);
    });
  }
  return filtradas;
}

export type PendenciaVisitaRh = {
  data_referencia: string;
  colaborador_nome: string;
  colaborador_setor: string | null;
  colaborador_unidade_nome: string | null;
  avaliador_gerente: string | null;
  media_gerente: number | null;
};

/** Semana com avaliação do gerente mas sem Visita RH (complemento pendente). */
export function calcularPendenciasVisitaRh(linhas: LinhaDiariaRelatorio[]): PendenciaVisitaRh[] {
  const porChave = new Map<
    string,
    { gerente?: LinhaDiariaRelatorio; rh?: LinhaDiariaRelatorio }
  >();

  for (const l of linhas) {
    const nome = String(l.colaborador_nome ?? '').trim() || '—';
    const key = `${l.data_referencia}\0${nome}`;
    const atual = porChave.get(key) ?? {};
    if (l.origem_visita_rh) {
      atual.rh = l;
    } else if (!atual.gerente) {
      atual.gerente = l;
    }
    porChave.set(key, atual);
  }

  const out: PendenciaVisitaRh[] = [];
  for (const [, par] of Array.from(porChave.entries())) {
    if (!par.gerente || par.rh) continue;
    const g = par.gerente;
    out.push({
      data_referencia: g.data_referencia,
      colaborador_nome: String(g.colaborador_nome ?? '—'),
      colaborador_setor: g.colaborador_setor ?? null,
      colaborador_unidade_nome: g.colaborador_unidade_nome ?? null,
      avaliador_gerente: g.avaliador_nome ?? null,
      media_gerente: g.media_dia,
    });
  }

  return out.sort((a, b) => {
    const d = b.data_referencia.localeCompare(a.data_referencia);
    if (d !== 0) return d;
    return a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
  });
}
