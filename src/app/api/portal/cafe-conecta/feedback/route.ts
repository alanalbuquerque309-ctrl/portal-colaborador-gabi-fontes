import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { grupoCafeConectaPorUnidadeSlug } from '@/lib/cafe-conecta/config';
import { registrarFeedbackCafeConecta } from '@/lib/cafe-conecta/historico';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  let body: { sorteio_id?: string; reacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400, headers: NO_STORE });
  }

  const sorteioId = String(body.sorteio_id ?? '').trim();
  const reacao = String(body.reacao ?? '').trim();
  if (!sorteioId || !reacao) {
    return NextResponse.json({ ok: false, erro: 'Sorteio e reação obrigatórios.' }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await registrarFeedbackCafeConecta(supabase, sorteioId, colaboradorId, reacao);
    if (!resultado.ok) {
      return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true, reacao }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
