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
import { normalizarTipoConteudo } from '@/lib/treinamento-conteudo';

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

    const tipoBody =
      body.tipo_conteudo != null ? normalizarTipoConteudo(String(body.tipo_conteudo)) : null;

    if (tipoBody === 'texto') {
      const texto = typeof body.conteudo_texto === 'string' ? body.conteudo_texto.trim() : '';
      if (!texto) {
        return NextResponse.json({ ok: false, erro: 'Informe o texto do material.' }, { status: 400 });
      }
      patch.tipo_conteudo = 'texto';
      patch.conteudo_texto = texto;
      patch.video_youtube_url = null;
    } else if (tipoBody === 'video') {
      patch.tipo_conteudo = 'video';
      patch.conteudo_texto = null;
    }

    if (typeof body.conteudo_texto === 'string' && tipoBody !== 'video') {
      const texto = body.conteudo_texto.trim();
      if (texto) patch.conteudo_texto = texto;
    }

    if (typeof body.video_youtube_url === 'string') {
      const url = body.video_youtube_url.trim();
      if (url && !extrairYoutubeVideoId(url)) {
        return NextResponse.json({ ok: false, erro: 'URL do YouTube inválida' }, { status: 400 });
      }
      if (url) {
        patch.video_youtube_url = url;
        if (!tipoBody) {
          patch.tipo_conteudo = 'video';
          patch.conteudo_texto = null;
        }
      }
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
