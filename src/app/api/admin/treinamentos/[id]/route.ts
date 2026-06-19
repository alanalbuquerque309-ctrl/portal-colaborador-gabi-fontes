import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  isPublicoAvisoKey,
  publicoLegacyFromUnidadeSlug,
  slugUnidadeReferenciaPublico,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';
import { extrairYoutubeVideoId } from '@/lib/graos/quinta-treino';

async function unidadeIdPorSlug(supabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.titulo === 'string') patch.titulo = body.titulo.trim();
    if (typeof body.descricao === 'string') patch.descricao = body.descricao.trim() || null;
    if (typeof body.video_youtube_url === 'string') {
      const url = body.video_youtube_url.trim();
      if (!extrairYoutubeVideoId(url)) {
        return NextResponse.json({ ok: false, erro: 'URL do YouTube inválida' }, { status: 400 });
      }
      patch.video_youtube_url = url;
    }
    if (typeof body.ativo === 'boolean') patch.ativo = body.ativo;
    if (typeof body.exige_confirmacao === 'boolean') patch.exige_confirmacao = body.exige_confirmacao;
    if (body.ordem != null) patch.ordem = Number(body.ordem) || 0;

    if (isPublicoAvisoKey(String(body.publico_alvo ?? ''))) {
      const publico = body.publico_alvo as PublicoAvisoKey;
      patch.publico_alvo = publico;
      const uid = await unidadeIdPorSlug(supabase, slugUnidadeReferenciaPublico(publico));
      if (uid) patch.unidade_id = uid;
    } else if (typeof body.unidade_slug === 'string') {
      const publico = publicoLegacyFromUnidadeSlug(body.unidade_slug);
      patch.publico_alvo = publico;
      const uid = await unidadeIdPorSlug(supabase, slugUnidadeReferenciaPublico(publico));
      if (uid) patch.unidade_id = uid;
    }

    const { error } = await supabase.from('treinamentos').update(patch).eq('id', id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const id = params.id?.trim();
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('treinamentos').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
