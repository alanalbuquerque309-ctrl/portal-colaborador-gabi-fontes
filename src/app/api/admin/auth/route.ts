import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveColaboradorForAdminBridge } from '@/lib/admin-portal-bridge';
import { parseManterLogado } from '@/lib/portal-login-persist';
import { applyAdminSessionCookie, applyPortalSessionCookies } from '@/lib/portal-session-cookies';

/**
 * Credenciais admin por senha vêm SOMENTE de variáveis de ambiente (Vercel).
 * Sem ADMIN_ALAN_LOGIN/ADMIN_ALAN_PASSWORD, o login admin por senha fica desativado;
 * o acesso administrativo continua disponível via login do portal com role socio/admin.
 */
function getAdminCredentials(): { login: string; senha: string }[] {
  const creds: { login: string; senha: string }[] = [];
  const login = process.env.ADMIN_ALAN_LOGIN?.trim().toLowerCase();
  const senha = process.env.ADMIN_ALAN_PASSWORD;
  if (login && senha) creds.push({ login, senha });
  return creds;
}

export async function POST(req: Request) {
  const body = await req.json();
  const login = (body.login ?? '').toString().trim().toLowerCase();
  const senha = (body.senha ?? body.password ?? '').toString();

  // Senha única legada: só funciona se ADMIN_PASSWORD estiver definida no ambiente (sem default).
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const credentials = getAdminCredentials();

  const credMatch = senha
    ? credentials.find((c) => c.login === login && c.senha === senha)
    : undefined;
  const legacyMatch = !login && !!adminPassword && senha === adminPassword;

  if (credMatch || legacyMatch) {
    const res = NextResponse.json({ ok: true });
    const persistent = parseManterLogado(body);
    applyAdminSessionCookie(res, { persistent });

    const loginBridge = credMatch?.login ?? login ?? process.env.ADMIN_ALAN_LOGIN?.trim() ?? '';
    try {
      const supabase = createAdminClient();
      const col = await resolveColaboradorForAdminBridge(supabase, loginBridge || null);
      if (col) {
        applyPortalSessionCookies(res, col, { persistent });
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
