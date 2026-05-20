import { cookies } from 'next/headers';

/**
 * Sessão portal (cookies HTTP) — servidor.
 * Espelha `getPortalSession` do cliente para rotas API.
 */
export async function getPortalSessionFromCookies(): Promise<{
  colaboradorId: string;
  unidadeId: string;
} | null> {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value ?? '';
  if (!colaboradorId || colaboradorId === 'pending') return null;
  return { colaboradorId, unidadeId };
}
