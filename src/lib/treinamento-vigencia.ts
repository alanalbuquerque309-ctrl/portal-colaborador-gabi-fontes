import { inicioCicloTreinoQuintaUtcIsoSp, rotuloCicloTreinoQuinta } from '@/lib/semana-brasil';
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

/** Treino cadastrado (texto ou vídeo) do ciclo vigente (quinta a quarta) para um público. */
export function treinoCadastradoVigentePorPublico(
  rows: TreinamentoDbRow[],
  publico: PublicoAvisoKey,
  formato?: 'texto' | 'video'
): TreinamentoDbRow | null {
  const cicloUtc = inicioCicloTreinoQuintaUtcIsoSp();
  const candidatos = rows
    .filter((r) => {
      if (r.ativo === false) return false;
      if (r.publico_alvo !== publico) return false;
      if (String(r.created_at) < cicloUtc) return false;
      if (!formato) return true;
      return normalizarTipoConteudo(r.tipo_conteudo) === formato;
    })
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return candidatos[0] ?? null;
}

/** Treino de texto do ciclo vigente (quinta a quarta) para um público. */
export function treinoTextoVigentePorPublico(
  rows: TreinamentoDbRow[],
  publico: PublicoAvisoKey
): TreinamentoDbRow | null {
  return treinoCadastradoVigentePorPublico(rows, publico, 'texto');
}

/**
 * Texto substituído por outro mais novo do mesmo público.
 *
 * A confirmação muda apenas o status pessoal. O último treinamento de cada
 * público continua atual e disponível até a publicação do próximo, mesmo
 * depois da virada do ciclo de quinta-feira.
 */
export function treinamentoTextoArquivado(
  row: TreinamentoDbRow,
  rows: TreinamentoDbRow[]
): boolean {
  if (normalizarTipoConteudo(row.tipo_conteudo) !== 'texto') return false;
  const publico = String(row.publico_alvo ?? '');
  return rows.some(
    (r) =>
      r.ativo !== false &&
      r.publico_alvo === publico &&
      normalizarTipoConteudo(r.tipo_conteudo) === 'texto' &&
      String(r.created_at) > String(row.created_at)
  );
}

/** Há treino de texto de liderança no ciclo vigente. */
export function haTreinoTextoLiderancaVigente(rows: TreinamentoDbRow[]): boolean {
  return treinoTextoVigentePorPublico(rows, 'lideranca') !== null;
}

/** Há treino de texto para todos no ciclo vigente. */
export function haTreinoTextoTodosVigente(rows: TreinamentoDbRow[]): boolean {
  return treinoTextoVigentePorPublico(rows, 'todos') !== null;
}

/**
 * Há treino cadastrado vigente (texto ou vídeo) para o público.
 * Quando true, o vídeo automático da Quinta (env YouTube) não deve competir na semana.
 */
export function haTreinoCadastradoVigente(
  rows: TreinamentoDbRow[],
  publico: PublicoAvisoKey
): boolean {
  return treinoCadastradoVigentePorPublico(rows, publico) !== null;
}

export function haTreinoCadastradoTodosVigente(rows: TreinamentoDbRow[]): boolean {
  return haTreinoCadastradoVigente(rows, 'todos');
}

export function haTreinoCadastradoLiderancaVigente(rows: TreinamentoDbRow[]): boolean {
  return haTreinoCadastradoVigente(rows, 'lideranca');
}

/** Rótulo legível da semana de publicação (ciclo quinta da data). */
export function rotuloSemanaTreino(createdAt: string | null | undefined): string {
  if (!createdAt) return 'Sem data';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return 'Sem data';
  const iso = d.toISOString().slice(0, 10);
  return rotuloCicloTreinoQuinta(iso);
}

export function rotuloSemanaCurto(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}
