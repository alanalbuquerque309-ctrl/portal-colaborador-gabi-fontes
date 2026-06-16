import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  isPublicoAvisoKey,
  publicoLegacyFromUnidadeSlug,
  slugUnidadeReferenciaPublico,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';

async function unidadeIdPorSlug(supabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  return data?.id ? String(data.id) : null;
}

/** Atualiza aviso. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  let body: {
    titulo?: string;
    conteudo?: string;
    unidade_id?: string;
    unidade_slug?: string;
    publico_alvo?: string;
    ativo?: boolean;
    exige_confirmacao?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const { titulo, conteudo, unidade_id, ativo, exige_confirmacao } = body;
  const payload: Record<string, unknown> = {};
  if (titulo !== undefined) payload.titulo = String(titulo).trim();
  if (conteudo !== undefined) payload.conteudo = conteudo?.trim() || null;
  if (unidade_id !== undefined) payload.unidade_id = unidade_id;
  if (ativo !== undefined) payload.ativo = ativo === true;
  if (exige_confirmacao !== undefined) payload.exige_confirmacao = exige_confirmacao === true;

  let publico: PublicoAvisoKey | null = null;
  if (isPublicoAvisoKey(body.publico_alvo)) {
    publico = body.publico_alvo;
  } else if (body.unidade_slug !== undefined) {
    publico = publicoLegacyFromUnidadeSlug(body.unidade_slug);
  }

  try {
    const supabase = createAdminClient();
    if (publico) {
      payload.publico_alvo = publico;
      const uid = await unidadeIdPorSlug(supabase, slugUnidadeReferenciaPublico(publico));
      if (uid) payload.unidade_id = uid;
    } else if (body.unidade_slug !== undefined) {
      const uid = await unidadeIdPorSlug(supabase, body.unidade_slug);
      if (uid) payload.unidade_id = uid;
    }

    let update = await supabase.from('avisos').update(payload).eq('id', id);
    if (update.error && /publico_alvo/i.test(update.error.message)) {
      const { publico_alvo: _omit, ...semPublico } = payload;
      update = await supabase.from('avisos').update(semPublico).eq('id', id);
    }

    if (update.error) return NextResponse.json({ ok: false, erro: update.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Exclui aviso. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('avisos').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
