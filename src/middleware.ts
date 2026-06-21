import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Enforcement da sessão assinada (passo 3 de segurança).
 *
 * Fecha dois vetores de forja:
 *  - `portal_colaborador_id` em texto puro (identidade do portal);
 *  - `admin_session` literal (sessão da senha-mestre).
 *
 * Sem `PORTAL_SESSION_SECRET` configurado, o middleware NÃO bloqueia (fail-open),
 * para o deploy nunca derrubar o portal. Durante a janela de carência, cookies
 * legados são aceitos e o cookie assinado é emitido em segundo plano (sem logout).
 */

const GRACE_UNTIL = Date.parse('2026-07-05T00:00:00Z');
const PERSIST_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias (igual ao portal)

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlEncodeString(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}

async function hmac(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return b64urlFromBytes(new Uint8Array(sig));
}

async function verifyToken(token: string | undefined, secret: string): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sig !== (await hmac(secret, body))) return null;
  try {
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function blocked(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, erro: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const secret = process.env.PORTAL_SESSION_SECRET?.trim();
  if (!secret) return NextResponse.next();

  const inGrace = Date.now() < GRACE_UNTIL;
  const path = req.nextUrl.pathname;
  const cid = req.cookies.get('portal_colaborador_id')?.value;
  const adminPaths = path.startsWith('/admin') || path.startsWith('/api/admin');

  // 1) Sessão do portal: se há id em texto, exigir assinatura que bata com ele.
  if (cid && cid !== 'pending') {
    const sess = await verifyToken(req.cookies.get('portal_sess')?.value, secret);
    if (sess && sess.i === cid) {
      return NextResponse.next();
    }
    if (inGrace) {
      const unidade = req.cookies.get('portal_unidade_id')?.value ?? '';
      const role = req.cookies.get('portal_role')?.value ?? '';
      const longa = req.cookies.get('portal_sessao_longa')?.value === '1';
      const body = b64urlEncodeString(JSON.stringify({ i: cid, u: unidade, r: role, t: Date.now() }));
      const token = `${body}.${await hmac(secret, body)}`;
      const res = NextResponse.next();
      res.cookies.set('portal_sess', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        ...(longa ? { maxAge: PERSIST_MAX_AGE } : {}),
      });
      return res;
    }
    return blocked(req);
  }

  // 2) Rotas admin sem id de portal: validar admin_session assinado (senha-mestre).
  if (adminPaths) {
    const adm = req.cookies.get('admin_session')?.value;
    if (adm) {
      if (adm === '1') {
        if (inGrace) return NextResponse.next();
        return blocked(req);
      }
      if (await verifyToken(adm, secret)) return NextResponse.next();
      if (!inGrace) return blocked(req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*', '/api/portal/:path*', '/api/admin/:path*'],
};
