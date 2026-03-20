import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/** Lista sugestões e reclamações. */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('sugestoes_reclamacoes')
      .select('id, tipo, texto, anonimo, created_at, colaborador_id, colaboradores(nome), unidades(nome)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (tipo === 'sugestao' || tipo === 'reclamacao') {
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
      autor: r.anonimo ? 'Anônimo' : (r.colaboradores as { nome?: string } | null)?.nome ?? '-',
      unidade: (r.unidades as { nome?: string } | null)?.nome ?? '-',
    }));

    return NextResponse.json({ ok: true, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
