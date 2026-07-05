import { inicioCicloTreinoQuintaUtcIsoSp } from '@/lib/semana-brasil';
import type { PublicoAvisoKey } from '@/lib/avisos-publico';
import { normalizarTipoConteudo } from '@/lib/treinamento-conteudo';

export type TreinamentoDbRow = {
  id: string;
  titulo?: string;
  publico_alvo: string | null;
  tipo_conteudo?: string | null;
  created_at: string;
  ativo?: boolean;
};

/** Treino de texto do ciclo vigente (quinta a quarta) para um público. */
export function treinoTextoVigentePorPublico(
  rows: TreinamentoDbRow[],
  publico: PublicoAvisoKey
): TreinamentoDbRow | null {
  const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();
  const candidatos = rows
    .filter(
      (r) =>
        r.ativo !== false &&
        r.publico_alvo === publico &&
        normalizarTipoConteudo(r.tipo_conteudo) === 'texto' &&
        String(r.created_at) >= cicloUtc
    )
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return candidatos[0] ?? null;
}

/** Texto de ciclo anterior ou substituído por outro mais novo do mesmo público. */
export function treinamentoTextoArquivado(
  row: TreinamentoDbRow,
  rows: TreinamentoDbRow[]
): boolean {
  if (normalizarTipoConteudo(row.tipo_conteudo) !== 'texto') return false;
  const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();
  const publico = String(row.publico_alvo ?? '');
  const maisNovo = rows
    .filter(
      (r) =>
        r.ativo !== false &&
        r.publico_alvo === publico &&
        normalizarTipoConteudo(r.tipo_conteudo) === 'texto' &&
        String(r.created_at) > String(row.created_at)
    )
    .length;
  if (maisNovo > 0) return true;
  return String(row.created_at) < cicloUtc;
}

/** Há treino de texto de liderança no ciclo vigente — vídeo quinta-lider não deve competir como pendência. */
export function haTreinoTextoLiderancaVigente(rows: TreinamentoDbRow[]): boolean {
  return treinoTextoVigentePorPublico(rows, 'lideranca') !== null;
}

/** Há treino de texto para todos no ciclo vigente. */
export function haTreinoTextoTodosVigente(rows: TreinamentoDbRow[]): boolean {
  return treinoTextoVigentePorPublico(rows, 'todos') !== null;
}
