import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAdminViewerContext,
  type AdminViewerContext,
} from '@/lib/admin-auth';
import { podeEditarCadastroColaborador } from '@/lib/admin-access';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import { gruposCafeConectaComSorteio } from '@/lib/cafe-conecta/config';
import { verificarAlertaCafeConectaAdmin } from '@/lib/cafe-conecta/service';
import { authGestorEmocional } from '@/lib/emocional-gestao-auth';
import { contarAlertasEmocionalNaoVistos } from '@/lib/emocional-alertas-count';
import { podeGerirSugestoesReclamacoes } from '@/lib/sugestoes-acesso';
import { contarSugestoesPendentesAnalise } from '@/lib/sugestoes-pendentes';
import {
  obterEvolucaoRedeResumoCacheado,
  obterIliRapidoCacheado,
  obterPendenciasSemanaRedeCacheadas,
} from '@/lib/cache/servidor-operacional';
import type { PayloadEvolucaoResumo } from '@/lib/evolucao-rede';

export type AdminDashboardAuthResumo = {
  acesso_limitado_rh: boolean;
  gestao_completa: boolean;
  pode_gerir_sugestoes: boolean;
};

export type AdminDashboardColaboradorResumo = {
  id: string;
  nome: string;
  onboarding_completo: boolean;
};

export type AdminDashboardAvisoResumo = {
  id: string;
  titulo: string;
  ativo?: boolean;
};

export type AdminDashboardPendenciaItem = {
  colaborador_nome: string;
  unidade_nome: string | null;
  responsavel_lider_label: string;
  tipo: string;
};

export type AdminDashboardResumoPayload = {
  ok: true;
  auth: AdminDashboardAuthResumo;
  colaboradores: AdminDashboardColaboradorResumo[];
  avisos: AdminDashboardAvisoResumo[];
  alertas_emocional: number;
  redefinicoes_pendentes: number;
  alerta_cafe_conecta: boolean;
  sugestoes_pendentes: number;
  saude_resumo: PayloadEvolucaoResumo | null;
  ili_resumo: Awaited<ReturnType<typeof obterIliRapidoCacheado>> | null;
  pendencias: {
    total: number;
    intervalo: string;
    meta: { alerta_critico_sexta?: boolean };
    resumo: { criticos_sem_avaliacao?: number };
    itens: AdminDashboardPendenciaItem[];
  } | null;
};

function flagsAuth(ctx: AdminViewerContext): AdminDashboardAuthResumo {
  const role = ctx.kind === 'portal' ? ctx.role : null;
  const senha = ctx.kind === 'password_session';
  const rh = ctx.nivel === 'rh_limitado';
  const gestaoCompleta =
    senha || (role != null && podeVerBonificacaoInterna(role) && !rh);
  const podeGerir =
    senha || (role != null && podeGerirSugestoesReclamacoes(role));

  return {
    acesso_limitado_rh: rh,
    gestao_completa: gestaoCompleta,
    pode_gerir_sugestoes: podeGerir,
  };
}

async function listarColaboradoresResumo(supabase: SupabaseClient): Promise<AdminDashboardColaboradorResumo[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nome, onboarding_completo')
    .order('nome');

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: String(c.id),
    nome: String(c.nome ?? ''),
    onboarding_completo: c.onboarding_completo === true,
  }));
}

async function listarAvisosAtivosResumo(supabase: SupabaseClient): Promise<AdminDashboardAvisoResumo[]> {
  const { data, error } = await supabase
    .from('avisos')
    .select('id, titulo, ativo')
    .order('data_publicacao', { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((a) => a.ativo !== false)
    .slice(0, 8)
    .map((a) => ({
      id: String(a.id),
      titulo: String(a.titulo ?? ''),
      ativo: a.ativo !== false,
    }));
}

async function contarRedefinicoesPendentes(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('solicitacoes_redefinicao_senha')
    .select('id')
    .eq('status', 'pendente')
    .limit(200);

  if (error) {
    const msg = String(error.message ?? '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('schema cache')) return 0;
    throw new Error(error.message);
  }

  return (data ?? []).length;
}

async function resolverRhAvaliadorId(ctx: AdminViewerContext): Promise<string | undefined> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (colaboradorId && colaboradorId !== 'pending') return colaboradorId;
  if (ctx.kind !== 'password_session') return undefined;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('colaboradores')
    .select('id')
    .in('role', ['admin', 'socio'])
    .order('role', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ? String(data.id) : undefined;
}

export async function montarAdminDashboardResumo(): Promise<
  { ok: false; status: number; erro: string } | AdminDashboardResumoPayload
> {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return { ok: false, status: 401, erro: 'Não autorizado' };
  }

  const auth = flagsAuth(ctx);
  const role = ctx.kind === 'portal' ? ctx.role : null;
  const senha = ctx.kind === 'password_session';
  const podeCadastro = podeEditarCadastroColaborador(role, senha);

  const supabase = createAdminClient();

  const tarefas: Promise<unknown>[] = [
    listarColaboradoresResumo(supabase),
    listarAvisosAtivosResumo(supabase),
    obterEvolucaoRedeResumoCacheado().catch(() => null),
    obterIliRapidoCacheado().catch(() => null),
  ];

  let emocionalPromise: Promise<number> = Promise.resolve(0);
  const emoAuth = await authGestorEmocional();
  if (emoAuth.ok) {
    emocionalPromise = contarAlertasEmocionalNaoVistos(supabase, emoAuth.colaboradorId).catch(() => 0);
  }
  tarefas.push(emocionalPromise);

  let redefPromise: Promise<number> = Promise.resolve(0);
  if (podeCadastro) {
    redefPromise = contarRedefinicoesPendentes(supabase).catch(() => 0);
  }
  tarefas.push(redefPromise);

  let cafePromise: Promise<boolean> = Promise.resolve(false);
  if (podeCadastro) {
    const grupos = gruposCafeConectaComSorteio();
    cafePromise = Promise.all(
      grupos.map((g) => verificarAlertaCafeConectaAdmin(supabase, g).catch(() => false))
    ).then((flags) => flags.some(Boolean));
  }
  tarefas.push(cafePromise);

  let sugestoesPromise: Promise<number> = Promise.resolve(0);
  if (auth.pode_gerir_sugestoes) {
    sugestoesPromise = contarSugestoesPendentesAnalise(supabase).catch(() => 0);
  }
  tarefas.push(sugestoesPromise);

  let pendenciasPromise: Promise<AdminDashboardResumoPayload['pendencias']> = Promise.resolve(null);
  if (auth.gestao_completa) {
    const rhId = await resolverRhAvaliadorId(ctx);
    pendenciasPromise = obterPendenciasSemanaRedeCacheadas(rhId)
      .then((resultado) => ({
        total: resultado.itens.length,
        intervalo: resultado.intervalo,
        meta: resultado.meta,
        resumo: resultado.resumo,
        itens: resultado.itens.map((p) => ({
          colaborador_nome: p.colaborador_nome,
          unidade_nome: p.unidade_nome,
          responsavel_lider_label: p.responsavel_lider_label,
          tipo: p.tipo,
        })),
      }))
      .catch(() => null);
  }
  tarefas.push(pendenciasPromise);

  const [
    colaboradores,
    avisos,
    saudeResumo,
    iliResumo,
    alertasEmocional,
    redefinicoesPendentes,
    alertaCafeConecta,
    sugestoesPendentes,
    pendencias,
  ] = (await Promise.all(tarefas)) as [
    AdminDashboardColaboradorResumo[],
    AdminDashboardAvisoResumo[],
    PayloadEvolucaoResumo | null,
    Awaited<ReturnType<typeof obterIliRapidoCacheado>> | null,
    number,
    number,
    boolean,
    number,
    AdminDashboardResumoPayload['pendencias'],
  ];

  return {
    ok: true,
    auth,
    colaboradores,
    avisos,
    alertas_emocional: alertasEmocional,
    redefinicoes_pendentes: redefinicoesPendentes,
    alerta_cafe_conecta: alertaCafeConecta,
    sugestoes_pendentes: sugestoesPendentes,
    saude_resumo: saudeResumo,
    ili_resumo: iliResumo,
    pendencias,
  };
}
