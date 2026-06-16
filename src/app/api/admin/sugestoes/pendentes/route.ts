import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeDestacarSugestaoGraos } from '@/lib/graos/sugestao-destaque';
import { contarSugestoesPendentesAnalise } from '@/lib/sugestoes-pendentes';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Quantas sugestões aguardam análise (só sócio/admin ou sessão por senha). */
export async function GET() {
  try {
    const ctx = await getAdminViewerContext();
    if (!ctx || !podeDestacarSugestaoGraos(ctx)) {
      return NextResponse.json({ ok: true, pendentes: 0 }, { headers: NO_STORE });
    }

    const supabase = createAdminClient();
    const pendentes = await contarSugestoesPendentesAnalise(supabase);
    return NextResponse.json({ ok: true, pendentes }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
