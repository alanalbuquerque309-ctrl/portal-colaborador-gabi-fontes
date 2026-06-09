import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { aniversarioNoDia, dataCivilBr } from '@/lib/data-civil-br';
import { carregarEstadoAniversarioHoje } from '@/lib/aniversario-hoje';

/** Registra parabéns a um aniversariante do dia. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { para_colaborador_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const paraId = body.para_colaborador_id?.trim();
  if (!paraId) {
    return NextResponse.json({ ok: false, erro: 'Informe para_colaborador_id' }, { status: 400 });
  }
  if (paraId === colaboradorId) {
    return NextResponse.json({ ok: false, erro: 'Use o balão de aniversariante para o seu dia' }, { status: 400 });
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

    const { data: alvo, error: errAlvo } = await supabase
      .from('colaboradores')
      .select('id, data_nascimento')
      .eq('id', paraId)
      .maybeSingle();

    if (errAlvo) return NextResponse.json({ ok: false, erro: errAlvo.message }, { status: 500 });
    if (!alvo || !aniversarioNoDia(alvo.data_nascimento)) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não é aniversariante de hoje' }, { status: 400 });
    }

    const dataRef = dataCivilBr();

    const { data: existente } = await supabase
      .from('aniversario_dia_acao')
      .select('id')
      .eq('colaborador_id', colaboradorId)
      .eq('para_colaborador_id', paraId)
      .eq('data_ref', dataRef)
      .eq('acao', 'parabens')
      .maybeSingle();

    if (!existente) {
      const { error } = await supabase.from('aniversario_dia_acao').insert({
        colaborador_id: colaboradorId,
        para_colaborador_id: paraId,
        data_ref: dataRef,
        acao: 'parabens',
      });

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ ok: true, ja_registrado: true });
        }
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
