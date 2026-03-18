import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Retorna escala do colaborador logado (próximas 2 semanas a partir de hoje). */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dias = Math.min(30, Math.max(7, parseInt(searchParams.get('dias') ?? '14', 10) || 14));

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ate = new Date(hoje);
  ate.setDate(ate.getDate() + dias);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('escalas')
      .select('id, data, hora_entrada, hora_saida, observacao')
      .eq('colaborador_id', colaboradorId)
      .gte('data', hoje.toISOString().slice(0, 10))
      .lte('data', ate.toISOString().slice(0, 10))
      .order('data', { ascending: true });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      escalas: (data ?? []).map((e: Record<string, unknown>) => ({
        id: e.id,
        data: e.data,
        hora_entrada: e.hora_entrada,
        hora_saida: e.hora_saida,
        observacao: e.observacao ?? null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
