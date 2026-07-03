import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { montarPayloadEvolucaoLideranca } from '@/lib/evolucao-lideranca';
import { obterIliRapidoCacheado } from '@/lib/cache/servidor-operacional';

/** Evolução do ILI por líder — completo sob demanda; ?rapido=1 só semana atual (dashboard). */
export async function GET(req: Request) {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const rapido = new URL(req.url).searchParams.get('rapido') === '1';

  try {
    const supabase = createAdminClient();
    if (rapido) {
      const resumo = await obterIliRapidoCacheado();
      return NextResponse.json({ ok: true, ...resumo });
    }
    const payload = await montarPayloadEvolucaoLideranca(supabase);
    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao calcular evolução de liderança';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
