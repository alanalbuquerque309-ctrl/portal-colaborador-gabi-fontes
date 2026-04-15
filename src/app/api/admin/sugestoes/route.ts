import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewReclamacoesAdmin, getAdminViewerContext, isAdminAuthorized } from '@/lib/admin-auth';

/** Lista sugestões e reclamações. Role administrativo (`admin`) não vê reclamações. */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const ctx = await getAdminViewerContext();
  const podeReclamacoes = canViewReclamacoesAdmin(ctx);

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  if (!podeReclamacoes && tipo === 'reclamacao') {
    return NextResponse.json({ ok: false, erro: 'Sem permissão para reclamações' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('sugestoes_reclamacoes')
      .select(
        'id, tipo, texto, anonimo, created_at, visualizado_em, curtidas, colaborador_id, colaboradores(nome), unidades(nome)'
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (!podeReclamacoes) {
      query = query.eq('tipo', 'sugestao');
    } else if (tipo === 'sugestao' || tipo === 'reclamacao') {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const itens = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      tipo: r.tipo,
      texto: r.texto,
      anonimo: r.anonimo === true,
      created_at: r.created_at,
      visualizado_em: r.visualizado_em ?? null,
      curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
      autor: r.anonimo ? 'Anônimo' : (r.colaboradores as { nome?: string } | null)?.nome ?? '-',
      unidade: (r.unidades as { nome?: string } | null)?.nome ?? '-',
    }));

    return NextResponse.json({ ok: true, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
