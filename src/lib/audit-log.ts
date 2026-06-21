import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidAdminToken } from '@/lib/portal-session-token';
import { ipDaRequisicao } from '@/lib/rate-limit';

/**
 * Auditoria de ações sensíveis (passo 5 de segurança).
 *
 * Append-only, sem PII: guarda QUEM (ator), O QUÊ (ação), em QUEM (alvo por id), QUANDO, IP e
 * metadados não-PII em `detalhes`. NUNCA passe CPF/nome/e-mail/senha em `detalhes`.
 *
 * Princípio FAIL-SAFE: registrar auditoria não pode derrubar nem atrasar a ação principal. Toda
 * falha (tabela ausente, erro de banco) é engolida. A trilha é defesa adicional, não o gate.
 */

const ADMIN_COOKIE = 'admin_session';
const PORTAL_COLABORADOR = 'portal_colaborador_id';

export type AtorTipo = 'portal' | 'senha_admin' | 'sistema';

/** Vocabulário de ações (estável; evita typos e facilita filtros/relatórios). */
export const AUDIT_ACOES = {
  LOGIN_ADMIN_SENHA: 'login.admin_senha.sucesso',
  COLAB_ROLE_ALTERAR: 'colaborador.role.alterar',
  COLAB_EXCLUIR: 'colaborador.excluir',
  COLAB_RESET_CADASTRO: 'colaborador.reset_cadastro',
  COLAB_REDEFINIR_SENHA: 'colaborador.senha.redefinir',
  REDEFINICAO_ATENDER: 'redefinicao_senha.atender',
  REDEFINICAO_REJEITAR: 'redefinicao_senha.rejeitar',
  MIGRATION_APLICAR: 'banco.migration.aplicar',
} as const;

export type AuditAtor = { atorColaboradorId: string | null; atorTipo: AtorTipo };

export type AuditEntrada = {
  acao: string;
  alvoTipo?: string | null;
  alvoId?: string | null;
  unidadeId?: string | null;
  detalhes?: Record<string, unknown> | null;
  /** Requisição, para extrair o IP automaticamente. */
  req?: Request;
  /** Ator explícito; se omitido, é resolvido pelos cookies da sessão. */
  ator?: AuditAtor;
};

/** Resolve o ator a partir dos cookies da sessão (portal assinado / sessão por senha). */
export async function resolverAtor(): Promise<AuditAtor> {
  try {
    const cookieStore = await cookies();
    const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
    if (colaboradorId && colaboradorId !== 'pending') {
      return { atorColaboradorId: colaboradorId, atorTipo: 'portal' };
    }
    if (isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)) {
      return { atorColaboradorId: null, atorTipo: 'senha_admin' };
    }
  } catch {
    /* sem contexto de cookies (ex.: chamada de sistema) */
  }
  return { atorColaboradorId: null, atorTipo: 'sistema' };
}

/**
 * Registra uma entrada na trilha de auditoria. Nunca lança — em qualquer erro, apenas ignora.
 */
export async function registrarAuditoria(
  supabase: SupabaseClient,
  entrada: AuditEntrada
): Promise<void> {
  try {
    const ator = entrada.ator ?? (await resolverAtor());
    const ip = entrada.req ? ipDaRequisicao(entrada.req) : null;

    await supabase.from('audit_log').insert({
      ator_colaborador_id: ator.atorColaboradorId,
      ator_tipo: ator.atorTipo,
      acao: entrada.acao,
      alvo_tipo: entrada.alvoTipo ?? null,
      alvo_id: entrada.alvoId ?? null,
      unidade_id: entrada.unidadeId ?? null,
      detalhes: entrada.detalhes ?? null,
      ip,
    });
  } catch {
    /* fail-safe: auditoria não pode quebrar a ação principal */
  }
}
