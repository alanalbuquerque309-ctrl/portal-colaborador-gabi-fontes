import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Assinatura HMAC da sessão do portal (servidor, runtime Node).
 * O cookie `portal_sess` carrega {id, unidade, role} assinado; o middleware (Edge)
 * valida a mesma assinatura. Sem `PORTAL_SESSION_SECRET` o sistema cai no comportamento
 * legado (não bloqueia), para o deploy nunca derrubar o portal.
 *
 * Janela de carência: até a data abaixo, cookies legados (sem assinatura, ou admin_session='1')
 * continuam aceitos para não deslogar ninguém. Depois dela, só vale o que está assinado.
 */
export const SESSION_GRACE_UNTIL = Date.parse('2026-07-05T00:00:00Z');

export type PortalSessPayload = { i: string; u: string; r: string; t: number };

function secret(): string {
  return process.env.PORTAL_SESSION_SECRET?.trim() ?? '';
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function hmac(body: string, key: string): string {
  return createHmac('sha256', key).update(body).digest('base64url');
}

function sigOk(sig: string, expected: string): boolean {
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Token assinado da sessão do portal. Retorna null se não houver segredo configurado. */
export function signPortalSess(p: { id: string; unidade_id: string; role: string }): string | null {
  const key = secret();
  if (!key) return null;
  const payload: PortalSessPayload = { i: p.id, u: p.unidade_id, r: p.role, t: Date.now() };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(body, key)}`;
}

export function verifyPortalSess(token: string | null | undefined): PortalSessPayload | null {
  const key = secret();
  if (!key || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!sigOk(sig, hmac(body, key))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as PortalSessPayload;
  } catch {
    return null;
  }
}

/** Token assinado da sessão admin (senha-mestre). Fallback '1' quando não há segredo. */
export function signAdminToken(): string {
  const key = secret();
  if (!key) return '1';
  const body = b64url(JSON.stringify({ a: 1, t: Date.now() }));
  return `${body}.${hmac(body, key)}`;
}

/** Valida admin_session. Sem segredo: comportamento legado ('1'). Com segredo: assinatura
 *  obrigatória, exceto '1' durante a janela de carência. */
export function isValidAdminToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const key = secret();
  if (!key) return value === '1';
  if (value === '1') return Date.now() < SESSION_GRACE_UNTIL;
  const dot = value.lastIndexOf('.');
  if (dot < 0) return false;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!sigOk(sig, hmac(body, key))) return false;
  try {
    const o = JSON.parse(Buffer.from(body, 'base64url').toString()) as { a?: number };
    return o?.a === 1;
  } catch {
    return false;
  }
}
