import { NextResponse } from 'next/server';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerAuditoria } from '@/lib/admin-access';
import { montarPainelTenantEspelhoAdmin } from '@/lib/tenant/admin-espelho-server';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } as const;

/** Espelho SaaS do tenant (somente leitura). Mesmo acesso da auditoria: sócios, admin ou senha. */
export async function GET() {
  const ctx = await getAdminViewerContext();
  const senha = ctx?.kind === 'password_session';
  const role = ctx?.kind === 'portal' ? ctx.role : null;
  if (!ctx || !podeVerAuditoria(role, senha)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403, headers: NO_STORE });
  }

  try {
    const painel = await montarPainelTenantEspelhoAdmin();
    return NextResponse.json({ ok: true, painel }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao carregar espelho do tenant';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
