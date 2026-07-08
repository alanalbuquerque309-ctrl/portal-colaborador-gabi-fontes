import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { obterReconhecimentoSemanalCacheado } from '@/lib/cache/portal-reconhecimentos-cache';

export const dynamic = 'force-dynamic';

/** Top 3 da semana (rede + por unidade) e troféus entre pares da semana. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const payload = await obterReconhecimentoSemanalCacheado();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
