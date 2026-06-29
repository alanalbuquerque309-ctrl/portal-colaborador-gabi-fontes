import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { contarSugestoesPendentesAnalise } from '@/lib/sugestoes-pendentes';
import { podeGerirSugestoesReclamacoes } from '@/lib/sugestoes-acesso';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Quantas mensagens aguardam análise (administração, RH e sócios). */
export async function GET() {
  try {
    const ctx = await getAdminViewerContext();
    const pode =
      ctx?.kind === 'password_session' ||
      (ctx?.kind === 'portal' && podeGerirSugestoesReclamacoes(ctx.role));
    if (!ctx || !pode) {
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
