import type { LinhaLiderRelatorio } from '@/components/portal/RelatorioAvaliacoesPorSetor';

export const PILARES_LIDERANCA = [
  { key: 'n_exemplo' as const, label: 'Exemplo e postura', short: 'Exemplo' },
  { key: 'n_comunicacao' as const, label: 'Comunicação clara', short: 'Comunicação' },
  { key: 'n_suporte' as const, label: 'Apoio e suporte', short: 'Suporte' },
  { key: 'n_justica' as const, label: 'Justiça e feedback', short: 'Justiça' },
  { key: 'n_clima' as const, label: 'Clima e emoções', short: 'Clima' },
] as const;

export type PilarKey = (typeof PILARES_LIDERANCA)[number]['key'];

export function notaBaixa(n: number): boolean {
  return n <= 3;
}

export function classeNota(n: number): string {
  if (n <= 2) return 'bg-red-100 text-red-900 border-red-300 font-semibold';
  if (n === 3) return 'bg-amber-100 text-amber-950 border-amber-300 font-semibold';
  if (n === 4) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  return 'bg-green-100 text-green-900 border-green-300';
}

export function classeMedia(media: number): string {
  if (media <= 2.5) return 'bg-red-100 text-red-900 border-red-300';
  if (media <= 3.5) return 'bg-amber-100 text-amber-950 border-amber-300';
  return 'bg-emerald-50 text-emerald-900 border-emerald-200';
}

export function formatarSemanaLider(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
  if (!m) return iso || '—';
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `Sem. ${dia} ${meses[mes - 1] ?? m[2]}`;
}

export function notasDaLinha(row: LinhaLiderRelatorio): Record<PilarKey, number> {
  return {
    n_exemplo: row.n_exemplo,
    n_comunicacao: row.n_comunicacao,
    n_suporte: row.n_suporte,
    n_justica: row.n_justica,
    n_clima: row.n_clima,
  };
}

export function linhaTemNotaBaixa(row: LinhaLiderRelatorio): boolean {
  return Object.values(notasDaLinha(row)).some(notaBaixa);
}

export function pilarMaisFracoLinha(row: LinhaLiderRelatorio): { key: PilarKey; nota: number; label: string } {
  let pior: { key: PilarKey; nota: number; label: string } | null = null;
  for (const p of PILARES_LIDERANCA) {
    const nota = row[p.key];
    if (!pior || nota < pior.nota) {
      pior = { key: p.key, nota, label: p.short };
    }
  }
  return pior!;
}

export function mediasPilaresGrupo(regs: LinhaLiderRelatorio[]): Record<PilarKey, number> {
  const acc: Record<PilarKey, number> = {
    n_exemplo: 0,
    n_comunicacao: 0,
    n_suporte: 0,
    n_justica: 0,
    n_clima: 0,
  };
  if (regs.length === 0) return acc;
  for (const r of regs) {
    for (const p of PILARES_LIDERANCA) {
      acc[p.key] += r[p.key];
    }
  }
  const n = regs.length;
  for (const p of PILARES_LIDERANCA) {
    acc[p.key] = Math.round((acc[p.key] / n) * 100) / 100;
  }
  return acc;
}

export function pilarMaisFracoGrupo(regs: LinhaLiderRelatorio[]): { label: string; nota: number } | null {
  if (regs.length === 0) return null;
  const medias = mediasPilaresGrupo(regs);
  let pior: { label: string; nota: number } | null = null;
  for (const p of PILARES_LIDERANCA) {
    const nota = medias[p.key];
    if (!pior || nota < pior.nota) {
      pior = { label: p.short, nota };
    }
  }
  return pior;
}

export function labelPilarInterno(key: string): string {
  const map: Record<string, string> = {
    exemplo: 'Exemplo e postura',
    comunicacao: 'Comunicação clara',
    suporte: 'Apoio e suporte',
    justica: 'Justiça e feedback',
    clima: 'Clima e emoções',
  };
  return map[key] ?? key;
}

export function filtrarLinhasLideranca(
  linhas: LinhaLiderRelatorio[],
  busca: string,
  somenteNotaBaixa: boolean
): LinhaLiderRelatorio[] {
  const q = busca.trim().toLowerCase();
  return linhas.filter((l) => {
    if (somenteNotaBaixa && !linhaTemNotaBaixa(l)) return false;
    if (!q) return true;
    const hay = `${l.avaliado_nome} ${l.avaliado_setor ?? ''} ${l.filial_nome ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}
