import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { carregarEstadoAniversarioHoje } from '@/lib/aniversario-hoje';

/** Estado do balão/faixa de aniversariantes do dia (após termômetro). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('nome, role')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errEu) return NextResponse.json({ ok: false, erro: errEu.message }, { status: 500 });

    const estado = await carregarEstadoAniversarioHoje(
      supabase,
      colaboradorId,
      eu?.nome ?? null,
      (eu as { role?: string | null } | null)?.role ?? null
    );
    return NextResponse.json(estado);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
