import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/** Lista destaque atual (para formulário de edição). */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('destaque')
      .select('id, colaborador_id, titulo, descricao, colaboradores(nome)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: true, destaque: null });

    const col = data.colaboradores as { nome?: string } | null;
    return NextResponse.json({
      ok: true,
      destaque: {
        id: data.id,
        colaborador_id: data.colaborador_id,
        colaborador_nome: col?.nome ?? '',
        titulo: data.titulo,
        descricao: data.descricao ?? '',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Define novo destaque (substitui visualmente o anterior — mantém histórico). */
export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: { colaborador_id?: string; titulo?: string; descricao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { colaborador_id, titulo, descricao } = body;
  if (!colaborador_id?.trim() || !titulo?.trim()) {
    return NextResponse.json({ ok: false, erro: 'Colaborador e título são obrigatórios' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('destaque')
      .insert({
        colaborador_id: colaborador_id.trim(),
        titulo: titulo.trim(),
        descricao: descricao?.trim() || null,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, destaque: { id: data?.id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
