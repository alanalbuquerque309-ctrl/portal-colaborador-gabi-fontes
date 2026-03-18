import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_COOKIE = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 horas

/** Credenciais via env — nada fica no código. */
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
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE);
  return NextResponse.json({ ok: session?.value === '1' });
}
