import { NextResponse } from 'next/server';
import { getTenantBrandingServer, getModulosTenantServer, getTermosTenantServer } from '@/lib/tenant/settings-server';

export const dynamic = 'force-dynamic';

/** Branding e termos resolvidos (env → DB opcional → defaults). Somente leitura. */
export async function GET() {
  try {
    const [branding, termos, modulos] = await Promise.all([
      getTenantBrandingServer(),
      getTermosTenantServer(),
      getModulosTenantServer(),
    ]);
    return NextResponse.json(
      { ok: true, branding, termos, modulos, fonte_db: process.env.USE_TENANT_DB === 'true' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
