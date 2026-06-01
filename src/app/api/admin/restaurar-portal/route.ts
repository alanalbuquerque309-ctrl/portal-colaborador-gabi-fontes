import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { resolveColaboradorForAdminBridge } from '@/lib/admin-portal-bridge';
import {
  applyPortalSessionCookies,
  PORTAL_COOKIE_COLABORADOR,
} from '@/lib/portal-session-cookies';

/**
 * Restaura cookies do portal quando o usuário já tem sessão admin mas perdeu a do portal
 * (ex.: voltar do Admin sem pedir login de novo).
 */
export async function POST(req: Request) {
  const okAdmin = await isAdminAuthorized();
  if (!okAdmin) {
    return NextResponse.json({ ok: false, erro: 'Sem sessão administrativa' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const existente = cookieStore.get(PORTAL_COOKIE_COLABORADOR)?.value;
  if (existente && existente !== 'pending') {
    return NextResponse.json({ ok: true, jaAtivo: true });
  }

  let loginHint: string | null = null;
  try {
    const body = await req.json();
    loginHint = (body?.login ?? body?.telefone ?? null) as string | null;
  } catch {
    loginHint = null;
  }

  const supabase = createAdminClient();
  const col = await resolveColaboradorForAdminBridge(supabase, loginHint);
  if (!col) {
    return NextResponse.json(
      {
        ok: false,
        erro: 'Não foi possível restaurar o portal. Entre com celular ou e-mail em /login.',
      },
      { status: 404 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    colaborador: { id: col.id, unidade_id: col.unidade_id, role: col.role },
  });
  applyPortalSessionCookies(res, col, { persistent: true });
  return res;
}
