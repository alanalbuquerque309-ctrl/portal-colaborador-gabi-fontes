import { NextResponse } from 'next/server';
import { getTenantBrandingServer, getModulosTenantServer, getTermosTenantServer, tenantEspelho061Disponivel } from '@/lib/tenant/settings-server';

export const dynamic = 'force-dynamic';

/** Branding e termos resolvidos (env → DB opcional → defaults). Somente leitura. */
export async function GET() {
  try {
    const [branding, termos, modulos, espelho_061_disponivel] = await Promise.all([
      getTenantBrandingServer(),
      getTermosTenantServer(),
      getModulosTenantServer(),
      tenantEspelho061Disponivel(),
    ]);
    return NextResponse.json(
      {
        ok: true,
        branding,
        termos,
        modulos,
        fonte_db: process.env.USE_TENANT_DB === 'true',
        espelho_061_disponivel,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
