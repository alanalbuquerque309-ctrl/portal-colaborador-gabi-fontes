import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/** Lista escalas (filtro por colaborador ou por período). */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const colaboradorId = searchParams.get('colaborador_id');
  const dataInicio = searchParams.get('data_inicio');
  const dataFim = searchParams.get('data_fim');

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('escalas')
      .select('id, data, hora_entrada, hora_saida, observacao, colaborador_id, colaboradores(nome)')
      .order('data', { ascending: true });

    if (colaboradorId) query = query.eq('colaborador_id', colaboradorId);
    if (dataInicio) query = query.gte('data', dataInicio);
    if (dataFim) query = query.lte('data', dataFim);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const escalas = (data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id,
      data: e.data,
      hora_entrada: e.hora_entrada,
      hora_saida: e.hora_saida,
      observacao: e.observacao ?? null,
      colaborador_id: e.colaborador_id,
      colaborador_nome: (e.colaboradores as { nome?: string } | null)?.nome ?? '',
    }));

    return NextResponse.json({ ok: true, escalas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Cria escala(s). Aceita array para cadastro em lote. */
export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: { escalas?: Array<{ colaborador_id: string; data: string; hora_entrada: string; hora_saida: string; observacao?: string }>; colaborador_id?: string; data?: string; hora_entrada?: string; hora_saida?: string; observacao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const itens = body.escalas ?? (body.colaborador_id && body.data ? [body] : []);
  if (itens.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Envie escalas ou colaborador_id, data, hora_entrada, hora_saida' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const payloads = itens.map((i) => ({
      colaborador_id: i.colaborador_id,
      data: i.data,
      hora_entrada: i.hora_entrada || '08:00',
      hora_saida: i.hora_saida || '14:00',
      observacao: i.observacao?.trim() || null,
    }));

    const { data, error } = await supabase.from('escalas').upsert(payloads, {
      onConflict: 'colaborador_id,data',
    }).select('id');

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ids: (data ?? []).map((r) => r.id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
