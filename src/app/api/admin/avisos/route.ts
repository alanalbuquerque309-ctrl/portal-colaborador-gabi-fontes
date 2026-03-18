import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_COOKIE = 'admin_session';

/** Lista avisos ativos. */
export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('avisos')
      .select('id, titulo, conteudo, data_publicacao, ativo, exige_confirmacao, unidade_id, unidades(nome)')
      .order('data_publicacao', { ascending: false });

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const avisos = (data ?? []).map((a: Record<string, unknown>) => ({
      id: a.id,
      titulo: a.titulo,
      conteudo: a.conteudo,
      data_publicacao: a.data_publicacao,
      ativo: a.ativo === true,
      exige_confirmacao: a.exige_confirmacao === true,
      unidade_id: a.unidade_id,
      unidade_nome: (a.unidades as { nome?: string } | null)?.nome ?? '',
    }));

    return NextResponse.json({ ok: true, avisos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Cria aviso. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: { titulo?: string; conteudo?: string; unidade_id?: string; unidade_slug?: string; exige_confirmacao?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { titulo, conteudo, unidade_id, unidade_slug, exige_confirmacao } = body;
  if (!titulo?.trim() || (!unidade_id && !unidade_slug)) {
    return NextResponse.json({ ok: false, erro: 'Título e unidade são obrigatórios' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    let unidadeIdResolvido = unidade_id;
    if (!unidadeIdResolvido && unidade_slug) {
      const { data: porSlug } = await supabase
        .from('unidades')
        .select('id')
        .eq('slug', unidade_slug)
        .maybeSingle();
      if (porSlug?.id) unidadeIdResolvido = porSlug.id;
    }
    if (!unidadeIdResolvido) {
      return NextResponse.json({ ok: false, erro: 'Unidade inválida' }, { status: 400 });
    }

    const payload = {
      titulo: titulo.trim(),
      conteudo: conteudo?.trim() || null,
      unidade_id: unidadeIdResolvido,
      ativo: true,
      exige_confirmacao: exige_confirmacao === true,
    };

    const { data, error } = await supabase
      .from('avisos')
      .insert(payload)
      .select('id, titulo')
      .single();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, aviso: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
