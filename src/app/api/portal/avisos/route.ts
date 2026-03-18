import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Lista avisos para o colaborador logado (sua unidade + Matriz). Inclui status de confirmação. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  const role = cookieStore.get('portal_role')?.value ?? '';

  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const verTodasLojas = ['socio', 'admin'].includes(role.toLowerCase());

    let query = supabase
      .from('avisos')
      .select('id, titulo, conteudo, data_publicacao, exige_confirmacao, unidade_id, unidades(nome)')
      .eq('ativo', true)
      .order('data_publicacao', { ascending: false });

    if (!verTodasLojas && unidadeId) {
      // Buscar id da unidade Matriz (avisos para todas)
      const { data: matriz } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', 'matriz')
        .maybeSingle();
      const matrizId = matriz?.id;
      if (matrizId) {
        query = query.or(`unidade_id.eq.${unidadeId},unidade_id.eq.${matrizId}`);
      } else {
        query = query.eq('unidade_id', unidadeId);
      }
    }

    const { data: avisosData, error: avisosErr } = await query;
    if (avisosErr) return NextResponse.json({ ok: false, erro: avisosErr.message }, { status: 500 });

    const avisos = avisosData ?? [];

    // Buscar confirmações do colaborador
    const { data: confirmacoes } = await supabase
      .from('aviso_confirmacoes')
      .select('aviso_id')
      .eq('colaborador_id', colaboradorId);

    const confirmadosSet = new Set((confirmacoes ?? []).map((c) => c.aviso_id));

    const resultado = avisos.map((a: Record<string, unknown>) => ({
      id: a.id,
      titulo: a.titulo,
      conteudo: a.conteudo,
      data_publicacao: a.data_publicacao,
      unidade_nome: (a.unidades as { nome?: string } | null)?.nome ?? '',
      exige_confirmacao: a.exige_confirmacao === true,
      confirmado: confirmadosSet.has(a.id as string),
    }));

    return NextResponse.json({ ok: true, avisos: resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
