import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { dataCivilBr } from '@/lib/data-civil-br';
import { carregarEstadoAniversarioHoje } from '@/lib/aniversario-hoje';

/** Fecha o balão do dia (OK) sem parabenizar quem falta. */
export async function POST() {
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

    const estadoPreview = await carregarEstadoAniversarioHoje(
      supabase,
      colaboradorId,
      eu?.nome ?? null,
      (eu as { role?: string | null } | null)?.role ?? null
    );
    if (!estadoPreview.pode_ver_feature) {
      return NextResponse.json({ ok: false, erro: 'Recurso indisponível' }, { status: 403 });
    }

    const dataRef = dataCivilBr();

    const { data: existente } = await supabase
      .from('aniversario_dia_acao')
      .select('id')
      .eq('colaborador_id', colaboradorId)
      .eq('data_ref', dataRef)
      .eq('acao', 'dispensar')
      .maybeSingle();

    if (!existente) {
      const { error } = await supabase.from('aniversario_dia_acao').insert({
        colaborador_id: colaboradorId,
        para_colaborador_id: null,
        data_ref: dataRef,
        acao: 'dispensar',
      });

      if (error && error.code !== '23505') {
        return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      }
    }

    const estado = await carregarEstadoAniversarioHoje(
      supabase,
      colaboradorId,
      eu?.nome ?? null,
      (eu as { role?: string | null } | null)?.role ?? null
    );
    return NextResponse.json({ ok: true, estado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
