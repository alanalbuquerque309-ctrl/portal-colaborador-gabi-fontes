/**
 * Resolve qual gerente (líder) do par 12x36 o colaborador deve avaliar,
 * com base na avaliação semanal que o gerente já fez em `avaliacoes_diarias`.
 *
 * Sinal: linha do gerente com assiduidade ≠ fora_plantao na semana alvo.
 * Sem sinal (gerente ainda não avaliou) → null (UI mantém escolha manual).
 * Histórico de `avaliacoes_lideranca` não é alterado aqui.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { assiduidadeDoBanco } from '@/lib/avaliacao-semanal-shared';
import {
  avaliacaoEstaIgnorada,
  erroColunaIgnoradaAusente,
} from '@/lib/avaliacao-ignorada';
import { isAvaliacaoDeVisitaRh } from '@/lib/avaliacao-rh-visita-access';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

type RowSinal = {
  avaliador_id: string;
  assiduidade: string | null;
  justificativa_nota_baixa: string | null;
  updated_at: string | null;
  ignorada?: boolean | null;
  avaliador_role?: string | null;
};

function contaComoSinalPlantao(
  row: RowSinal,
  rhIds: Set<string>
): boolean {
  if (avaliacaoEstaIgnorada(row)) return false;
  if (isAvaliacaoDeVisitaRh(row.avaliador_id, row.avaliador_role, rhIds)) return false;
  return assiduidadeDoBanco(row.assiduidade, row.justificativa_nota_baixa) !== 'fora_plantao';
}

/**
 * Entre os gerentes candidatos (≥2), devolve o id do plantão do colaborador
 * na `semanaAlvo` (normalmente a semana anterior / «semana passada»), ou null.
 */
export async function resolverLiderPlantaoPorAvaliacaoGerente(
  supabase: SupabaseAdmin,
  colaboradorId: string,
  liderDiretoIds: string[],
  semanaAlvo: string
): Promise<string | null> {
  const candidatos = Array.from(
    new Set(liderDiretoIds.map(String).filter((id) => id && id !== colaboradorId))
  );
  if (candidatos.length < 2) return null;

  const semana = String(semanaAlvo ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) return null;

  const selComIgnorada =
    'avaliador_id, assiduidade, justificativa_nota_baixa, updated_at, ignorada';
  const selSemIgnorada =
    'avaliador_id, assiduidade, justificativa_nota_baixa, updated_at';

  let dataRows: unknown[] | null = null;
  let queryError: { message: string } | null = null;

  const first = await supabase
    .from('avaliacoes_diarias')
    .select(selComIgnorada)
    .eq('colaborador_id', colaboradorId)
    .eq('data_referencia', semana)
    .in('avaliador_id', candidatos);

  if (first.error && erroColunaIgnoradaAusente(first.error.message)) {
    const fallback = await supabase
      .from('avaliacoes_diarias')
      .select(selSemIgnorada)
      .eq('colaborador_id', colaboradorId)
      .eq('data_referencia', semana)
      .in('avaliador_id', candidatos);
    dataRows = fallback.data;
    queryError = fallback.error;
  } else {
    dataRows = first.data;
    queryError = first.error;
  }

  if (queryError) {
    throw new Error(queryError.message);
  }

  const raw = (dataRows ?? []) as unknown as RowSinal[];
  if (raw.length === 0) return null;

  const avaliadorIds = Array.from(
    new Set(raw.map((r) => String(r.avaliador_id ?? '')).filter(Boolean))
  );
  const { data: rolesRows } = await supabase
    .from('colaboradores')
    .select('id, role')
    .in('id', avaliadorIds);

  const rolePorId = new Map(
    (rolesRows ?? []).map((r) => [String(r.id), String((r as { role?: string }).role ?? '')])
  );
  const rhIds = new Set(
    avaliadorIds.filter((id) => normalizePortalRole(rolePorId.get(id)) === 'rh')
  );

  const sinais = raw
    .map((r) => ({
      ...r,
      avaliador_id: String(r.avaliador_id),
      avaliador_role: rolePorId.get(String(r.avaliador_id)) ?? null,
    }))
    .filter((r) => candidatos.includes(r.avaliador_id) && contaComoSinalPlantao(r, rhIds))
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));

  if (sinais.length === 0) return null;

  const unicos = Array.from(new Set(sinais.map((s) => s.avaliador_id)));
  if (unicos.length === 1) return unicos[0] ?? null;

  // Raro: dois gerentes com avaliação «real» — fica o mais recente.
  return sinais[0]?.avaliador_id ?? null;
}

/** Filtra a lista de avaliados: mantém no máx. um `lider_direto` (o plantão resolvido). */
export function filtrarAvaliadosPeloPlantaoResolvido<
  T extends { id: string; papel: string },
>(avaliados: T[], liderPlantaoId: string | null): T[] {
  if (!liderPlantaoId) return avaliados;
  const lideres = avaliados.filter((a) => a.papel === 'lider_direto');
  if (lideres.length < 2) return avaliados;
  return avaliados.filter(
    (a) => a.papel !== 'lider_direto' || a.id === liderPlantaoId
  );
}
