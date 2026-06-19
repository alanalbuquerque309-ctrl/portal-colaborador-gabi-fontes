import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Registra que o colaborador abriu/visualizou o aviso (sem confirmar). */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { aviso_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const avisoId = body.aviso_id?.trim();
  if (!avisoId) {
    return NextResponse.json({ ok: false, erro: 'aviso_id é obrigatório' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('aviso_visualizacoes').upsert(
      {
        aviso_id: avisoId,
        colaborador_id: colaboradorId,
        visualizado_em: new Date().toISOString(),
      },
      { onConflict: 'aviso_id,colaborador_id' }
    );

    if (error) {
      if (/aviso_visualizacoes|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ ok: true, legado: true });
      }
      if (error.code === '23503') {
        return NextResponse.json({ ok: false, erro: 'Aviso não encontrado' }, { status: 404 });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
