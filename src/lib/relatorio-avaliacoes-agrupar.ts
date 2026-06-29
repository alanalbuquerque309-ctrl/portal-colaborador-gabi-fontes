import { listarSetoresCadastro } from '@/lib/tenant/org-catalog';

export const SETOR_RELATORIO_SEM_DEFINICAO = 'Sem setor definido';

export type GrupoColaboradorLinhas<T> = { nome: string; linhas: T[] };
export type GrupoSetorColaboradores<T> = { setor: string; colaboradores: GrupoColaboradorLinhas<T>[] };

function normalizarSetor(setor: string | null | undefined): string {
  const s = String(setor ?? '').trim();
  return s || SETOR_RELATORIO_SEM_DEFINICAO;
}

export function ordenarSetoresRelatorio(setoresEncontrados: Iterable<string>): string[] {
  const set = new Set(setoresEncontrados);
  const out: string[] = [];
  const setoresPredefinidos = listarSetoresCadastro();
  for (const s of setoresPredefinidos) {
    if (set.has(s)) out.push(s);
  }
  const extras = Array.from(set)
    .filter((s) => s !== SETOR_RELATORIO_SEM_DEFINICAO && !setoresPredefinidos.includes(s))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  out.push(...extras);
  if (set.has(SETOR_RELATORIO_SEM_DEFINICAO)) out.push(SETOR_RELATORIO_SEM_DEFINICAO);
  return out;
}

/** Agrupa linhas do relatório: setor → colaborador (nome) → registros. */
export function agruparPorSetorEColaborador<T>(
  linhas: T[],
  getSetor: (item: T) => string | null | undefined,
  getNome: (item: T) => string | null | undefined
): GrupoSetorColaboradores<T>[] {
  const porSetor = new Map<string, Map<string, T[]>>();

  for (const linha of linhas) {
    const setor = normalizarSetor(getSetor(linha));
    const nome = String(getNome(linha) ?? '').trim() || '—';
    if (!porSetor.has(setor)) porSetor.set(setor, new Map());
    const porNome = porSetor.get(setor)!;
    if (!porNome.has(nome)) porNome.set(nome, []);
    porNome.get(nome)!.push(linha);
  }

  return ordenarSetoresRelatorio(porSetor.keys()).map((setor) => {
    const porNome = porSetor.get(setor)!;
    const colaboradores = Array.from(porNome.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([nome, regs]) => ({ nome, linhas: regs }));
    return { setor, colaboradores };
  });
}
