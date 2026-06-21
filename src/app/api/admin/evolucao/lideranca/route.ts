import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { montarPayloadEvolucaoLideranca } from '@/lib/evolucao-lideranca';

/** Evolução do ILI por líder — cálculo pesado; carregar sob demanda (aba Liderança). */
export async function GET() {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const payload = await montarPayloadEvolucaoLideranca(supabase);
    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao calcular evolução de liderança';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
