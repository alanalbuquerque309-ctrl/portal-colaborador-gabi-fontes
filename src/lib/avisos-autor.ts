import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidAdminToken } from '@/lib/portal-session-token';

const ADMIN_COOKIE = 'admin_session';
const PORTAL_COLABORADOR = 'portal_colaborador_id';

export type AutorAvisoPublicacao = {
  id: string | null;
  nome: string;
};

/** Quem está a publicar o aviso (portal logado ou sessão admin por senha). */
export async function resolverAutorPublicacaoAviso(
  supabase: SupabaseClient
): Promise<AutorAvisoPublicacao> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get(PORTAL_COLABORADOR)?.value;
  if (colaboradorId && colaboradorId !== 'pending') {
    const { data } = await supabase
      .from('colaboradores')
      .select('nome')
      .eq('id', colaboradorId)
      .maybeSingle();
    const nome = data?.nome ? String(data.nome).trim() : '';
    if (nome) return { id: colaboradorId, nome };
  }

  if (isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return { id: null, nome: 'Administração' };
  }

  return { id: null, nome: 'Administração' };
}

export function nomeAutorAvisoExibicao(opts: {
  publicado_por_nome?: string | null;
  colaborador_nome?: string | null;
}): string {
  const snap = String(opts.publicado_por_nome ?? '').trim();
  if (snap) return snap;
  const join = String(opts.colaborador_nome ?? '').trim();
  if (join) return join;
  return '';
}

export function erroColunaAutorAviso(msg: string | null | undefined): boolean {
  return !!msg && /publicado_por_(id|nome)/i.test(msg);
}
