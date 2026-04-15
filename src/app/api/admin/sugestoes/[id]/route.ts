import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewReclamacoesAdmin, getAdminViewerContext, isAdminAuthorized } from '@/lib/admin-auth';

/** Marca sugestão/reclamação como vista pela administração. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }
  const ctx = await getAdminViewerContext();
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  let body: { visualizado?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  if (body.visualizado !== true) {
    return NextResponse.json({ ok: false, erro: 'Use visualizado: true' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: row, error: errRow } = await supabase
      .from('sugestoes_reclamacoes')
      .select('tipo')
      .eq('id', id)
      .single();

    if (errRow || !row) {
      return NextResponse.json({ ok: false, erro: 'Registro não encontrado' }, { status: 404 });
    }
    if ((row as { tipo?: string }).tipo === 'reclamacao' && !canViewReclamacoesAdmin(ctx)) {
      return NextResponse.json({ ok: false, erro: 'Sem permissão para reclamações' }, { status: 403 });
    }

    const { error } = await supabase
      .from('sugestoes_reclamacoes')
      .update({ visualizado_em: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
