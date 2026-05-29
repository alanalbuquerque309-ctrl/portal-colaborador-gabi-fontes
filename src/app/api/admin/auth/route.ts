import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveColaboradorForAdminBridge } from '@/lib/admin-portal-bridge';
import { applyAdminSessionCookie, applyPortalSessionCookies } from '@/lib/portal-session-cookies';

/** Credenciais via env + fallbacks para admin/gabifontes. */
function getAdminCredentials(): { login: string; senha: string }[] {
  const creds: { login: string; senha: string }[] = [];
  const login = process.env.ADMIN_ALAN_LOGIN?.trim().toLowerCase();
  const senha = process.env.ADMIN_ALAN_PASSWORD;
  if (login && senha) creds.push({ login, senha });
  // Fallback: admin + gabifontes2019 ou gabifontes2024 (caso env não esteja configurada em prod)
  creds.push({ login: 'admin', senha: 'gabifontes2019' });
  creds.push({ login: 'admin', senha: 'gabifontes2024' });
  return creds;
}

export async function POST(req: Request) {
  const body = await req.json();
  const login = (body.login ?? '').toString().trim().toLowerCase();
  const senha = (body.senha ?? body.password ?? '').toString();

  const adminPassword = process.env.ADMIN_PASSWORD || 'gabifontes2024';
  const credentials = getAdminCredentials();

  const credMatch = credentials.find((c) => c.login === login && c.senha === senha);
  const legacyMatch = !login && senha === adminPassword; // senha única antiga ainda funciona

  if (credMatch || legacyMatch) {
    const res = NextResponse.json({ ok: true });
    applyAdminSessionCookie(res);

    const loginBridge = credMatch?.login ?? login ?? process.env.ADMIN_ALAN_LOGIN?.trim() ?? '';
    try {
      const supabase = createAdminClient();
      const col = await resolveColaboradorForAdminBridge(supabase, loginBridge || null);
      if (col) {
        applyPortalSessionCookies(res, col);
      }
    } catch {
      /* bridge opcional; admin segue só com admin_session */
    }

    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function GET() {
  const { isAdminAuthorized, getAdminViewerContext, canViewReclamacoesAdmin } = await import(
    '@/lib/admin-auth'
  );
  const { podeVerBonificacaoInterna } = await import('@/lib/bonificacao-access');
  const ok = await isAdminAuthorized();
  if (!ok) return NextResponse.json({ ok: false });
  const ctx = await getAdminViewerContext();
  const role = ctx?.kind === 'portal' ? ctx.role : null;
  const podeGorjeta =
    ctx?.kind === 'password_session' || (role != null && podeVerBonificacaoInterna(role));
  return NextResponse.json({
    ok: true,
    podeVerReclamacoes: canViewReclamacoesAdmin(ctx),
    podeVerGorjeta: podeGorjeta,
    /** @deprecated use podeVerGorjeta */
    podeVerBonificacao: podeGorjeta,
  });
}
