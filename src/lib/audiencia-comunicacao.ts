import type { createAdminClient } from '@/lib/supabase/admin';
import {
  colaboradorRecebeAvisoPublico,
  resolverPublicoAviso,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';
import { normalizePortalRole } from '@/lib/roles';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type PessoaAudiencia = {
  id: string;
  nome: string;
  setor: string | null;
  unidade_nome: string | null;
  visualizado_em: string | null;
  confirmado_em: string | null;
};

export type ResumoAudienciaComunicacao = {
  total_esperado: number;
  confirmados: PessoaAudiencia[];
  abriu_nao_confirmou: PessoaAudiencia[];
  nao_fez: PessoaAudiencia[];
};

async function listarColaboradoresPublico(
  supabase: SupabaseAdmin,
  publico: PublicoAvisoKey,
  opts?: { incluirSocios?: boolean }
): Promise<PessoaAudiencia[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, setor, role, unidades(nome, slug)')
    .order('nome');

  if (error) throw new Error(error.message);

  const out: PessoaAudiencia[] = [];
  for (const c of data ?? []) {
    const un = c.unidades as { nome?: string; slug?: string } | { nome?: string; slug?: string }[] | null;
    const u = Array.isArray(un) ? un[0] : un;
    const slug = u?.slug ?? '';
    const recebe = colaboradorRecebeAvisoPublico(
      { unidade_slug: slug, setor: (c.setor as string | null) ?? null, role: (c.role as string | null) ?? null },
      publico
    );
    if (!recebe) continue;
    // Avisos: sócio fica de fora de «todos» (não opera). Treinos: conta, porque o sócio pode fazer e confirmar.
    if (
      !opts?.incluirSocios &&
      publico !== 'lideranca' &&
      normalizePortalRole(c.role) === 'socio'
    ) {
      continue;
    }
    out.push({
      id: String(c.id),
      nome: String(c.nome ?? ''),
      setor: (c.setor as string | null) ?? null,
      unidade_nome: u?.nome ? String(u.nome) : null,
      visualizado_em: null,
      confirmado_em: null,
    });
  }
  return out;
}

export async function montarAudienciaAviso(
  supabase: SupabaseAdmin,
  avisoId: string
): Promise<ResumoAudienciaComunicacao & { titulo: string; exige_confirmacao: boolean; publico: PublicoAvisoKey }> {
  const { data: aviso, error } = await supabase
    .from('avisos')
    .select('id, titulo, exige_confirmacao, publico_alvo, unidades(slug)')
    .eq('id', avisoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!aviso) throw new Error('Aviso não encontrado');

  const unidade = aviso.unidades as { slug?: string } | null;
  const publico = resolverPublicoAviso(aviso.publico_alvo as string | null, unidade?.slug ?? null);
  const esperados = await listarColaboradoresPublico(supabase, publico);
  const ids = esperados.map((p) => p.id);

  const visualMap = new Map<string, string>();
  const confMap = new Map<string, string>();

  if (ids.length > 0) {
    const { data: vis } = await supabase
      .from('aviso_visualizacoes')
      .select('colaborador_id, visualizado_em')
      .eq('aviso_id', avisoId)
      .in('colaborador_id', ids);
    for (const v of vis ?? []) {
      visualMap.set(String(v.colaborador_id), String(v.visualizado_em ?? ''));
    }

    const { data: conf } = await supabase
      .from('aviso_confirmacoes')
      .select('colaborador_id, confirmado_em')
      .eq('aviso_id', avisoId)
      .in('colaborador_id', ids);
    for (const c of conf ?? []) {
      confMap.set(String(c.colaborador_id), String(c.confirmado_em ?? ''));
    }
  }

  const confirmados: PessoaAudiencia[] = [];
  const abriu_nao_confirmou: PessoaAudiencia[] = [];
  const nao_fez: PessoaAudiencia[] = [];

  for (const p of esperados) {
    const visualizado_em = visualMap.get(p.id) ?? null;
    const confirmado_em = confMap.get(p.id) ?? null;
    const row = { ...p, visualizado_em, confirmado_em };
    if (confirmado_em) confirmados.push(row);
    else if (visualizado_em) abriu_nao_confirmou.push(row);
    else nao_fez.push(row);
  }

  const byNome = (a: PessoaAudiencia, b: PessoaAudiencia) => a.nome.localeCompare(b.nome, 'pt-BR');
  confirmados.sort(byNome);
  abriu_nao_confirmou.sort(byNome);
  nao_fez.sort(byNome);

  return {
    titulo: String(aviso.titulo ?? ''),
    exige_confirmacao: aviso.exige_confirmacao === true,
    publico,
    total_esperado: esperados.length,
    confirmados,
    abriu_nao_confirmou,
    nao_fez,
  };
}

export async function montarAudienciaTreinamento(
  supabase: SupabaseAdmin,
  treinamentoId: string
): Promise<ResumoAudienciaComunicacao & { titulo: string; exige_confirmacao: boolean; publico: PublicoAvisoKey }> {
  const { data: treino, error } = await supabase
    .from('treinamentos')
    .select('id, titulo, exige_confirmacao, publico_alvo, unidades:unidade_id(slug)')
    .eq('id', treinamentoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!treino) throw new Error('Treinamento não encontrado');

  const unidade = treino.unidades as { slug?: string } | null;
  const publico = resolverPublicoAviso(treino.publico_alvo as string | null, unidade?.slug ?? null);
  // Inclui sócios: eles recebem o material e a confirmação precisa aparecer no «X fez».
  const esperados = await listarColaboradoresPublico(supabase, publico, { incluirSocios: true });
  const ids = esperados.map((p) => p.id);

  const visualMap = new Map<string, string>();
  const confMap = new Map<string, string>();

  if (ids.length > 0) {
    const { data: vis } = await supabase
      .from('treinamento_visualizacoes')
      .select('colaborador_id, visualizado_em')
      .eq('treinamento_id', treinamentoId)
      .in('colaborador_id', ids);
    for (const v of vis ?? []) {
      visualMap.set(String(v.colaborador_id), String(v.visualizado_em ?? ''));
    }

    const { data: conf } = await supabase
      .from('treinamento_confirmacoes')
      .select('colaborador_id, confirmado_em')
      .eq('treinamento_id', treinamentoId)
      .in('colaborador_id', ids);
    for (const c of conf ?? []) {
      confMap.set(String(c.colaborador_id), String(c.confirmado_em ?? ''));
    }
  }

  const confirmados: PessoaAudiencia[] = [];
  const abriu_nao_confirmou: PessoaAudiencia[] = [];
  const nao_fez: PessoaAudiencia[] = [];

  for (const p of esperados) {
    const visualizado_em = visualMap.get(p.id) ?? null;
    const confirmado_em = confMap.get(p.id) ?? null;
    const row = { ...p, visualizado_em, confirmado_em };
    if (confirmado_em) confirmados.push(row);
    else if (visualizado_em) abriu_nao_confirmou.push(row);
    else nao_fez.push(row);
  }

  const byNome = (a: PessoaAudiencia, b: PessoaAudiencia) => a.nome.localeCompare(b.nome, 'pt-BR');
  confirmados.sort(byNome);
  abriu_nao_confirmou.sort(byNome);
  nao_fez.sort(byNome);

  return {
    titulo: String(treino.titulo ?? ''),
    exige_confirmacao: treino.exige_confirmacao === true,
    publico,
    total_esperado: esperados.length,
    confirmados,
    abriu_nao_confirmou,
    nao_fez,
  };
}
