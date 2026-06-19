import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  isPublicoAvisoKey,
  labelPublicoAviso,
  publicoLegacyFromUnidadeSlug,
  resolverPublicoAviso,
  slugUnidadeReferenciaPublico,
  type PublicoAvisoKey,
} from '@/lib/avisos-publico';
import { extrairYoutubeVideoId } from '@/lib/graos/quinta-treino';

const SELECT =
  'id, titulo, descricao, video_youtube_url, publico_alvo, exige_confirmacao, ativo, ordem, created_at, unidade_id, unidades(nome, slug)';

async function unidadeIdPorSlug(supabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  return data?.id ? String(data.id) : null;
}

function resolverPublicoDoBody(body: { publico_alvo?: string; unidade_slug?: string }): PublicoAvisoKey | null {
  if (isPublicoAvisoKey(body.publico_alvo)) return body.publico_alvo;
  if (body.unidade_slug?.trim()) return publicoLegacyFromUnidadeSlug(body.unidade_slug);
  return null;
}

function mapRow(a: Record<string, unknown>) {
  const unidade = a.unidades as { nome?: string; slug?: string } | null;
  const unidadeSlug = unidade?.slug ?? '';
  const publico = resolverPublicoAviso(a.publico_alvo as string | null | undefined, unidadeSlug);
  return {
    id: a.id,
    titulo: a.titulo,
    descricao: a.descricao,
    video_youtube_url: a.video_youtube_url,
    data_publicacao: a.created_at,
    ativo: a.ativo === true,
    exige_confirmacao: a.exige_confirmacao === true,
    ordem: Number(a.ordem) || 0,
    unidade_id: a.unidade_id,
    unidade_nome: unidade?.nome ?? '',
    publico_alvo: publico,
    publico_label: labelPublicoAviso(publico),
    youtube_ok: Boolean(extrairYoutubeVideoId(String(a.video_youtube_url ?? ''))),
  };
}

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('treinamentos')
      .select(SELECT)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      if (/treinamentos|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ ok: true, treinamentos: [], migracao_pendente: true });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, treinamentos: (data ?? []).map(mapRow) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: {
    titulo?: string;
    descricao?: string;
    video_youtube_url?: string;
    publico_alvo?: string;
    exige_confirmacao?: boolean;
    ordem?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const titulo = body.titulo?.trim();
  const publico = resolverPublicoDoBody(body);
  const videoUrl = body.video_youtube_url?.trim() ?? '';
  if (!titulo || !publico) {
    return NextResponse.json({ ok: false, erro: 'Título e público são obrigatórios' }, { status: 400 });
  }
  if (!extrairYoutubeVideoId(videoUrl)) {
    return NextResponse.json({ ok: false, erro: 'Informe uma URL válida do YouTube.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const unidadeId = await unidadeIdPorSlug(supabase, slugUnidadeReferenciaPublico(publico));
    if (!unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Unidade de referência inválida' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('treinamentos')
      .insert({
        titulo,
        descricao: body.descricao?.trim() || null,
        video_youtube_url: videoUrl,
        publico_alvo: publico,
        unidade_id: unidadeId,
        exige_confirmacao: body.exige_confirmacao === true,
        ordem: Number(body.ordem) || 0,
        ativo: true,
      })
      .select('id, titulo')
      .single();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, treinamento: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
