import type { createAdminClient } from '@/lib/supabase/admin';
import { isSetorValido, SETORES_AVALIACAO_EQUIPE_BACKOFFICE, SLUG_UNIDADE_ADMINISTRATIVO } from '@/lib/constants/colaborador-org';
import {
  LIDER_TRANSVERSAL_CD_NOME,
  SETORES_LIDERANCA_DANIEL_TRANSVERSAL,
} from '@/lib/config-lideranca-operacional';
import { SETOR_TODOS_NA_UNIDADE } from '@/lib/lideranca-constants';
import { normalizePortalRole } from '@/lib/roles';

function normalizarTextoOrg(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarNomeLider(nome: string): string {
  return normalizarTextoOrg(nome);
}

/** Colaborador da loja/operação avalia Daniel (admin) só se for backoffice ou unidade Administrativo. */
export function colaboradorDeveAvaliarAdministradorEmpresa(
  setor: string | null | undefined,
  unidadeSlug: string | null | undefined
): boolean {
  const slug = String(unidadeSlug ?? '').trim().toLowerCase();
  if (slug === SLUG_UNIDADE_ADMINISTRATIVO) return true;
  const setorNorm = normalizarTextoOrg(setor);
  if (!setorNorm) return false;
  return SETORES_LIDERANCA_DANIEL_TRANSVERSAL.some(
    (s) => normalizarTextoOrg(s) === setorNorm
  );
}

function isLiderTransversalCd(nome: string): boolean {
  const alvo = normalizarNomeLider(LIDER_TRANSVERSAL_CD_NOME);
  const n = normalizarNomeLider(nome);
  if (!n || !alvo) return false;
  return n === alvo || n.includes('daniel');
}

/** Daniel só pode aparecer como chefe quando o setor do colaborador é transversal (CD, Motorista, etc.). */
function liderConfigPermitidoParaSetorColaborador(nomeLider: string, setorColaborador: string): boolean {
  if (!isLiderTransversalCd(nomeLider)) return true;
  const setor = String(setorColaborador ?? '').trim();
  if (!setor) return false;
  const norm = normalizarNomeLider(setor);
  return SETORES_LIDERANCA_DANIEL_TRANSVERSAL.some((s) => normalizarNomeLider(s) === norm);
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
  const setorEspecifico = setorTrim && isSetorValido(setorTrim);

  let porSetor: { lider_id: string }[] | null = [];
  let errSetor: { message: string } | null = null;
  if (setorEspecifico) {
    const res = await supabase
      .from('lideres_por_setor')
      .select('lider_id')
      .eq('unidade_id', unidadeId)
      .eq('setor', setorTrim)
      .eq('ativo', true);
    porSetor = res.data;
    errSetor = res.error;
  }

  const { data: porUnidade, error: errUnidade } = await supabase
    .from('lideres_por_setor')
    .select('lider_id')
    .eq('unidade_id', unidadeId)
    .eq('setor', SETOR_TODOS_NA_UNIDADE)
    .eq('ativo', true);

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
    .select('id, nome, role')
    .in('id', ids);
  if (errCols) throw new Error(errCols.message);

  const setorParaFiltro = setorEspecifico ? setorTrim : '';
  return (cols ?? [])
    .filter((c) => liderConfigPermitidoParaSetorColaborador(String(c.nome ?? ''), setorParaFiltro))
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
    onboarding_completo: boolean;
    operacao_apto: boolean;
  }>
> {
  const setorCfg = setor.trim();
  if (setorCfg !== SETOR_TODOS_NA_UNIDADE && !isSetorValido(setorCfg)) return [];

  let query = supabase
    .from('colaboradores')
    .select('id, nome, role, cargo, setor, onboarding_completo, operacao_apto')
    .eq('unidade_id', unidadeId)
    .order('nome');

  if (setorCfg !== SETOR_TODOS_NA_UNIDADE) {
    query = query.eq('setor', setorCfg);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((c) => {
      const id = String(c.id);
      if (excluirId && id === excluirId) return false;
      const role = (c as { role?: string }).role;
      const setor = (c as { setor?: string | null }).setor;
      const r = normalizePortalRole(role);
      if (r === 'colaborador') return true;
      const setorTrim = String(setor ?? '').trim();
      return (
        (r === 'gerente' || r === 'admin') &&
        (SETORES_AVALIACAO_EQUIPE_BACKOFFICE as readonly string[]).includes(setorTrim)
      );
    })
    .map((c) => ({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      role: (c as { role?: string | null }).role ?? null,
      cargo: (c as { cargo?: string | null }).cargo ?? null,
      setor: (c as { setor?: string | null }).setor ?? null,
      onboarding_completo: Boolean((c as { onboarding_completo?: boolean }).onboarding_completo),
      operacao_apto: (c as { operacao_apto?: boolean }).operacao_apto === true,
    }));
}
