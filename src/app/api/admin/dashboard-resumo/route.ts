import { NextResponse } from 'next/server';
import { montarAdminDashboardResumo } from '@/lib/admin-dashboard-resumo';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Pacote único do dashboard admin (substitui ~10 fetches no cliente). */
export async function GET() {
  try {
    const payload = await montarAdminDashboardResumo();
    if (!payload.ok) {
      return NextResponse.json(
        { ok: false, erro: payload.erro },
        { status: payload.status, headers: NO_STORE }
      );
    }
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
