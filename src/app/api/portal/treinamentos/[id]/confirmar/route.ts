import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const treinamentoId = params.id?.trim();
  if (!treinamentoId) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    await supabase.from('treinamento_visualizacoes').upsert(
      {
        treinamento_id: treinamentoId,
        colaborador_id: colaboradorId,
        visualizado_em: now,
      },
      { onConflict: 'treinamento_id,colaborador_id' }
    );

    const { error } = await supabase.from('treinamento_confirmacoes').upsert(
      {
        treinamento_id: treinamentoId,
        colaborador_id: colaboradorId,
        confirmado_em: now,
      },
      { onConflict: 'treinamento_id,colaborador_id' }
    );

    if (error) {
      if (/treinamento_confirmacoes|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ ok: true, legado: true });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
