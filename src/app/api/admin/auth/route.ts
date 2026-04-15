import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_COOKIE = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 horas

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
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function GET() {
  const { isAdminAuthorized, getAdminViewerContext, canViewReclamacoesAdmin } = await import(
    '@/lib/admin-auth'
  );
  const ok = await isAdminAuthorized();
  if (!ok) return NextResponse.json({ ok: false });
  const ctx = await getAdminViewerContext();
  return NextResponse.json({
    ok: true,
    podeVerReclamacoes: canViewReclamacoesAdmin(ctx),
  });
}
