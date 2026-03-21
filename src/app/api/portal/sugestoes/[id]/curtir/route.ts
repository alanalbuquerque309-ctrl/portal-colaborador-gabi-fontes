import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { sincronizarCurtidas } from '@/lib/sugestoes-curtidas';

/** Curtir / descurtir uma sugestão (apenas tipo sugestão). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: row, error: errRow } = await supabase
      .from('sugestoes_reclamacoes')
      .select('id, tipo')
      .eq('id', id)
      .maybeSingle();

    if (errRow || !row) {
      return NextResponse.json({ ok: false, erro: 'Sugestão não encontrada' }, { status: 404 });
    }
    if (row.tipo !== 'sugestao') {
      return NextResponse.json({ ok: false, erro: 'Só é possível curtir sugestões' }, { status: 400 });
    }

    const { data: ja } = await supabase
      .from('sugestao_curtidas')
      .select('sugestao_id')
      .eq('sugestao_id', id)
      .eq('colaborador_id', colaboradorId)
      .maybeSingle();

    if (ja) {
      await supabase.from('sugestao_curtidas').delete().eq('sugestao_id', id).eq('colaborador_id', colaboradorId);
    } else {
      await supabase.from('sugestao_curtidas').insert({ sugestao_id: id, colaborador_id: colaboradorId });
    }

    await sincronizarCurtidas(supabase, id);

    const { data: atual } = await supabase
      .from('sugestoes_reclamacoes')
      .select('curtidas')
      .eq('id', id)
      .single();

    return NextResponse.json({
      ok: true,
      curtiu: !ja,
      curtidas: typeof atual?.curtidas === 'number' ? atual.curtidas : 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
