import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Retorna o destaque atual (mais recente). Requer login no portal. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('destaque')
      .select('id, titulo, descricao, colaborador_id, colaboradores(nome, foto_url)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: true, destaque: null });

    const col = data.colaboradores as { nome?: string; foto_url?: string } | null;
    return NextResponse.json({
      ok: true,
      destaque: {
        id: data.id,
        titulo: data.titulo,
        descricao: data.descricao ?? '',
        colaborador_nome: col?.nome ?? '',
        colaborador_foto: col?.foto_url ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
