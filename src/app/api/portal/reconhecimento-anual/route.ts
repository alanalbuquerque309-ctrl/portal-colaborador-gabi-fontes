import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { obterReconhecimentoAnualCacheado } from '@/lib/cache/portal-reconhecimentos-cache';

export const dynamic = 'force-dynamic';

/** Rankings anuais acumulados (avaliação + troféus do ano corrente). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const payload = await obterReconhecimentoAnualCacheado();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
