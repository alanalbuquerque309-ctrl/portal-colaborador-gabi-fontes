import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewReclamacoesAdmin, getAdminViewerContext, requireAdminFullApi } from '@/lib/admin-auth';
import { podeDestacarSugestaoGraos } from '@/lib/graos/sugestao-destaque';
import { listarSugestoesAdmin } from '@/lib/sugestoes-admin-lista';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Lista sugestões e reclamações. Role administrativo (`admin`) não vê reclamações. */
export async function GET(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

  const ctx = await getAdminViewerContext();
  const podeReclamacoes = canViewReclamacoesAdmin(ctx);
  const podeDestacarGraos = podeDestacarSugestaoGraos(ctx);

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  if (!podeReclamacoes && tipo === 'reclamacao') {
    return NextResponse.json(
      { ok: false, erro: 'Sem permissão para reclamações' },
      { status: 403, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const filtroTipo =
      !podeReclamacoes
        ? { somenteSugestoes: true as const }
        : tipo === 'sugestao' || tipo === 'reclamacao'
          ? { tipo: tipo as 'sugestao' | 'reclamacao' }
          : {};

    const { itens, aviso } = await listarSugestoesAdmin(supabase, filtroTipo);

    return NextResponse.json(
      { ok: true, itens, pode_destacar_graos: podeDestacarGraos, aviso },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
