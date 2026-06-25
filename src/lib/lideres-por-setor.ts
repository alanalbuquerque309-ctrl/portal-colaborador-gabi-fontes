import type { createAdminClient } from '@/lib/supabase/admin';
import { isSetorValido, SETORES_AVALIACAO_EQUIPE_BACKOFFICE } from '@/lib/constants/colaborador-org';
import { SETORES_LIDERANCA_DANIEL_TRANSVERSAL } from '@/lib/config-lideranca-operacional';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { isLiderAdministradorTransversal } from '@/lib/lideranca-transversal';
import { normalizePortalRole } from '@/lib/roles';
import {
  deveExcluirSetorDaListaCompletaUnidade,
  isSetorLideradoNaFabrica,
  isSetorLiderancaDanielTransversal,
  resolverUnidadeIdFabrica,
  resolverUnidadeIdsGrupoMesquita,
  resolverTodasUnidadeIds,
} from '@/lib/setores-fabrica-lideranca';
import { normalizarSetorOrganizacional, setoresDbEquivalentes } from '@/lib/lideranca-org';

function normalizarTextoOrg(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Administrador da empresa na avaliação de liderança: só estes setores. */
export function colaboradorDeveAvaliarAdministradorEmpresa(
  setor: string | null | undefined,
  _unidadeSlug?: string | null | undefined
): boolean {
  const setorNorm = normalizarTextoOrg(normalizarSetorOrganizacional(setor));
  if (!setorNorm) return false;
  return SETORES_LIDERANCA_DANIEL_TRANSVERSAL.some(
    (s) => normalizarTextoOrg(s) === setorNorm
  );
}

/** Só administrador transversal (cargo/role) aparece como chefe fora dos setores de backoffice. */
function liderConfigPermitidoParaSetorColaborador(
  lider: { role?: string | null; cargo?: string | null },
  setorColaborador: string
): boolean {
  if (!isLiderAdministradorTransversal(lider.role, lider.cargo)) return true;
  const setorNorm = normalizarTextoOrg(normalizarSetorOrganizacional(setorColaborador));
  if (!setorNorm) return false;
  return SETORES_LIDERANCA_DANIEL_TRANSVERSAL.some((s) => normalizarTextoOrg(s) === setorNorm);
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type LiderSetorRow = {
  id: string;
  unidade_id: string;
  setor: string;
  lider_id: string;
  ativo: boolean;
  lider_nome?: string;
  unidade_nome?: string;
};

/** Pares (unidade, setor) em que este colaborador está configurado como líder. */
export async function listarSetoresLideradosPor(
  supabase: SupabaseAdmin,
  liderId: string
): Promise<Array<{ unidade_id: string; setor: string }>> {
  const { data, error } = await supabase
    .from('lideres_por_setor')
    .select('unidade_id, setor')
    .eq('lider_id', liderId)
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  const out: Array<{ unidade_id: string; setor: string }> = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const uid = String(row.unidade_id ?? '');
    const setor = String(row.setor ?? '').trim();
    if (!uid || !setor) continue;
    const key = `${uid}|${setor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ unidade_id: uid, setor });
  }
  return out;
}

/** Líderes configurados para unidade + setor do colaborador (inclui wildcard `*` na unidade). */
export async function listarLideresConfigPorUnidadeSetor(
  supabase: SupabaseAdmin,
  unidadeId: string | null | undefined,
  setor: string | null | undefined
): Promise<Array<{ id: string; nome: string; role: string }>> {
  if (!unidadeId) return [];

  const setorTrim = String(setor ?? '').trim();
  const setorCanon = normalizarSetorOrganizacional(setorTrim);
  const setorEspecifico = setorTrim && isSetorValido(setorTrim);
  const setorFabrica = setorEspecifico && isSetorLideradoNaFabrica(setorCanon || setorTrim);

  const unidadeIdLideranca = setorFabrica
    ? (await resolverUnidadeIdFabrica(supabase)) ?? unidadeId
    : unidadeId;

  let porSetor: { lider_id: string }[] | null = [];
  let errSetor: { message: string } | null = null;
  if (setorEspecifico) {
    const equiv = setoresDbEquivalentes(setorCanon || setorTrim);
    const res = await supabase
      .from('lideres_por_setor')
      .select('lider_id')
      .eq('unidade_id', unidadeIdLideranca)
      .in('setor', equiv)
      .eq('ativo', true);
    porSetor = res.data;
    errSetor = res.error;
  }

  let porUnidade: { lider_id: string }[] | null = [];
  let errUnidade: { message: string } | null = null;
  if (!setorFabrica) {
    const res = await supabase
      .from('lideres_por_setor')
      .select('lider_id')
      .eq('unidade_id', unidadeId)
      .eq('setor', SETOR_TODOS_NA_UNIDADE)
      .eq('ativo', true);
    porUnidade = res.data;
    errUnidade = res.error;
  }

  const error = errSetor ?? errUnidade;
  if (error) {
    if (/lideres_por_setor|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const ids = Array.from(
    new Set(
      [...(porSetor ?? []), ...(porUnidade ?? [])]
        .map((r) => String(r.lider_id ?? ''))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return [];

  const { data: cols, error: errCols } = await supabase
    .from('colaboradores')
    .select('id, nome, role, cargo')
    .in('id', ids);
  if (errCols) throw new Error(errCols.message);

  const setorParaFiltro = setorEspecifico ? setorCanon || setorTrim : '';
  return (cols ?? [])
    .filter((c) =>
      liderConfigPermitidoParaSetorColaborador(
        {
          role: (c as { role?: string }).role,
          cargo: (c as { cargo?: string | null }).cargo,
        },
        setorParaFiltro
      )
    )
    .map((c) => ({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      role: String((c as { role?: string }).role ?? ''),
    }));
}

/** Colaboradores (role colaborador) no mesmo unidade+setor — liderados derivados. `setor` `*` = toda a unidade. */
export async function listarColaboradoresPorUnidadeSetor(
  supabase: SupabaseAdmin,
  unidadeId: string,
  setor: string,
  excluirId?: string
): Promise<
  Array<{
    id: string;
    nome: string;
    role: string | null;
    cargo: string | null;
    setor: string | null;
    tipo_escala: string | null;
    onboarding_completo: boolean;
    operacao_apto: boolean;
  }>
> {
  const setorCfg = setor.trim();
  if (setorCfg !== SETOR_TODOS_NA_UNIDADE && !isSetorValido(setorCfg)) return [];

  const filtrarMembro = (c: Record<string, unknown>) => {
    const id = String(c.id);
    if (excluirId && id === excluirId) return false;
    const role = (c as { role?: string }).role;
    const setorCol = (c as { setor?: string | null }).setor;
    const r = normalizePortalRole(role);
    if (r === 'colaborador') return true;
    const setorTrim = normalizarSetorOrganizacional(String(setorCol ?? ''));
    return (
      (r === 'gerente' || r === 'admin') &&
      (SETORES_AVALIACAO_EQUIPE_BACKOFFICE as readonly string[]).includes(setorTrim)
    );
  };

  const mapearMembro = (c: Record<string, unknown>) => ({
    id: String(c.id),
    nome: String(c.nome ?? ''),
    role: (c as { role?: string | null }).role ?? null,
    cargo: (c as { cargo?: string | null }).cargo ?? null,
    setor: (c as { setor?: string | null }).setor ?? null,
    tipo_escala: (c as { tipo_escala?: string | null }).tipo_escala ?? null,
    onboarding_completo: Boolean((c as { onboarding_completo?: boolean }).onboarding_completo),
    operacao_apto: (c as { operacao_apto?: boolean }).operacao_apto === true,
  });

  if (setorCfg !== SETOR_TODOS_NA_UNIDADE && isSetorLideradoNaFabrica(setorCfg)) {
    const grupoIds = await resolverUnidadeIdsGrupoMesquita(supabase);
    if (grupoIds.length === 0) return [];

    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto')
      .in('unidade_id', grupoIds)
      .eq('setor', setorCfg)
      .order('nome');

    if (error) throw new Error(error.message);
    return (data ?? []).filter(filtrarMembro).map(mapearMembro);
  }

  if (setorCfg !== SETOR_TODOS_NA_UNIDADE && isSetorLiderancaDanielTransversal(setorCfg)) {
    const todasIds = await resolverTodasUnidadeIds(supabase);
    if (todasIds.length === 0) return [];

    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto')
      .in('unidade_id', todasIds)
      .in('setor', setoresDbEquivalentes(setorCfg))
      .order('nome');

    if (error) throw new Error(error.message);
    return (data ?? []).filter(filtrarMembro).map(mapearMembro);
  }

  const { data: unidadeRow } = await supabase
    .from('unidades')
    .select('slug')
    .eq('id', unidadeId)
    .maybeSingle();
  const unidadeSlug = unidadeRow?.slug ? String(unidadeRow.slug) : null;

  let query = supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, tipo_escala, onboarding_completo, operacao_apto')
    .eq('unidade_id', unidadeId)
    .order('nome');

  if (setorCfg !== SETOR_TODOS_NA_UNIDADE) {
    const equiv = setoresDbEquivalentes(setorCfg);
    if (equiv.length === 1) query = query.eq('setor', equiv[0]);
    else query = query.in('setor', equiv);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((c) => {
      if (!filtrarMembro(c as Record<string, unknown>)) return false;
      if (setorCfg === SETOR_TODOS_NA_UNIDADE) {
        const setorCol = (c as { setor?: string | null }).setor;
        if (deveExcluirSetorDaListaCompletaUnidade(unidadeSlug, setorCol)) return false;
      }
      return true;
    })
    .map((c) => mapearMembro(c as Record<string, unknown>));
}
