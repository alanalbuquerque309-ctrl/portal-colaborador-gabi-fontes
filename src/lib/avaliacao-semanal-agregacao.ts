import {
  getAvaliadorRhGeralIdEnv,
  isAvaliacaoDeVisitaRh,
  nomeEhAvaliadorRhGeral,
  podeAvaliarRhVisitaGeral,
} from '@/lib/avaliacao-rh-visita-access';
import {
  BONIFICACAO_PESO_AVAL_GERENTE,
  BONIFICACAO_PESO_AVAL_RH,
} from '@/lib/bonificacao-config';
import type { SemanaAvaliacao } from '@/lib/bonificacao-indice';

export type AvaliacaoSemanalBruta = {
  data_referencia: string;
  assiduidade: string | null;
  media_dia: number | null;
  avaliador_id: string;
  avaliador_role: string | null;
  avaliador_nome?: string | null;
};

export function construirConjuntoIdsRh(
  avaliadores: Array<{ id: string; role?: string | null; setor?: string | null; nome?: string | null }>
): Set<string> {
  const ids = new Set<string>();
  const envId = getAvaliadorRhGeralIdEnv();
  if (envId) ids.add(envId);
  for (const a of avaliadores) {
    if (
      podeAvaliarRhVisitaGeral({
        colaboradorId: a.id,
        role: a.role,
        setor: a.setor,
        nome: a.nome,
      })
    ) {
      ids.add(a.id);
    }
  }
  return ids;
}

function mediaNumerica(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

/** Funde gerente + Visita RH na mesma semana (gorjeta). Assiduidade: prioriza avaliação do gerente. */
export function agregarSemanasAvaliacaoParaGorjeta(
  brutas: AvaliacaoSemanalBruta[],
  rhIds: Set<string>
): SemanaAvaliacao[] {
  const byWeek = new Map<string, AvaliacaoSemanalBruta[]>();
  for (const b of brutas) {
    const list = byWeek.get(b.data_referencia) ?? [];
    list.push(b);
    byWeek.set(b.data_referencia, list);
  }

  const out: SemanaAvaliacao[] = [];
  for (const [data_referencia, rows] of Array.from(byWeek.entries())) {
    const rhRows = rows.filter((r) =>
      isAvaliacaoDeVisitaRh(r.avaliador_id, r.avaliador_role, rhIds)
    );
    const gerenteRows = rows.filter(
      (r) => !isAvaliacaoDeVisitaRh(r.avaliador_id, r.avaliador_role, rhIds)
    );

    const mediasGer = gerenteRows
      .map((r) => r.media_dia)
      .filter((m): m is number => m != null && !Number.isNaN(m));
    const mediasRh = rhRows
      .map((r) => r.media_dia)
      .filter((m): m is number => m != null && !Number.isNaN(m));

    let media_dia: number | null = null;
    const avgGer = mediaNumerica(mediasGer);
    const avgRh = mediaNumerica(mediasRh);
    if (avgGer != null && avgRh != null) {
      media_dia =
        Math.round(
          (avgGer * BONIFICACAO_PESO_AVAL_GERENTE + avgRh * BONIFICACAO_PESO_AVAL_RH) * 100
        ) / 100;
    } else {
      media_dia = avgGer ?? avgRh;
    }

    const assidSource = gerenteRows[0] ?? rhRows[0] ?? rows[0];
    out.push({
      data_referencia,
      assiduidade: assidSource?.assiduidade ?? null,
      media_dia,
    });
  }

  return out.sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
}

/** Rotula avaliador para relatórios. */
export function rotuloAvaliadorRelatorio(
  avaliadorId: string,
  avaliadorRole: string | null | undefined,
  avaliadorNome: string | null | undefined,
  rhIds: Set<string>
): string {
  if (isAvaliacaoDeVisitaRh(avaliadorId, avaliadorRole, rhIds)) return 'Visita RH';
  if (nomeEhAvaliadorRhGeral(avaliadorNome)) return 'Visita RH';
  return avaliadorNome?.trim() || 'Liderança';
}
