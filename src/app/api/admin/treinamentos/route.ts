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
import { resolverParTreinosQuinta } from '@/lib/graos/quinta-treino';
import { normalizarTipoConteudo } from '@/lib/treinamento-conteudo';

const SELECT =
  'id, titulo, descricao, video_youtube_url, tipo_conteudo, conteudo_texto, publico_alvo, exige_confirmacao, ativo, ordem, created_at, unidade_id, unidades(nome, slug)';
const SELECT_SEM_TIPO =
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
  const tipoConteudo = normalizarTipoConteudo(a.tipo_conteudo as string | null | undefined);
  const videoUrl = String(a.video_youtube_url ?? '');
  return {
    id: a.id,
    titulo: a.titulo,
    descricao: a.descricao,
    video_youtube_url: a.video_youtube_url,
    tipo_conteudo: tipoConteudo,
    conteudo_texto: a.conteudo_texto ? String(a.conteudo_texto) : null,
    data_publicacao: a.created_at,
    ativo: a.ativo === true,
    exige_confirmacao: a.exige_confirmacao === true,
    ordem: Number(a.ordem) || 0,
    unidade_id: a.unidade_id,
    unidade_nome: unidade?.nome ?? '',
    unidade_slug: unidadeSlug,
    publico_alvo: publico,
    publico_label: labelPublicoAviso(publico),
    youtube_ok: tipoConteudo === 'video' ? Boolean(extrairYoutubeVideoId(videoUrl)) : true,
  };
}

function mapTreinosAutomaticos(origin: string) {
  const par = resolverParTreinosQuinta(origin);
  return [
    {
      id: 'quinta-colaborador',
      titulo: par.colaborador.titulo,
      descricao: par.colaborador.resumo,
      embed_url: par.colaborador.embed_url,
      youtube_ok: Boolean(par.colaborador.youtube_video_id),
    },
    {
      id: 'quinta-lider',
      titulo: par.lider.titulo,
      descricao: par.lider.resumo,
      embed_url: par.lider.embed_url,
      youtube_ok: Boolean(par.lider.youtube_video_id),
    },
  ];
}

export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const treinosAutomaticos = mapTreinosAutomaticos(origin);

  try {
    const supabase = createAdminClient();
    const queryFull = await supabase
      .from('treinamentos')
      .select(SELECT)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });

    const query =
      queryFull.error && /tipo_conteudo|conteudo_texto|schema cache/i.test(queryFull.error.message)
        ? await supabase
            .from('treinamentos')
            .select(SELECT_SEM_TIPO)
            .order('ordem', { ascending: true })
            .order('created_at', { ascending: false })
        : queryFull;

    const { data, error } = query;

    if (error) {
      if (/treinamentos|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({
          ok: true,
          treinamentos: [],
          treinos_automaticos: treinosAutomaticos,
          migracao_pendente: true,
        });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      treinamentos: (data ?? []).map(mapRow),
      treinos_automaticos: treinosAutomaticos,
    });
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
    tipo_conteudo?: string;
    conteudo_texto?: string;
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
  const tipoConteudo = normalizarTipoConteudo(body.tipo_conteudo);
  const videoUrl = body.video_youtube_url?.trim() ?? '';
  const conteudoTexto = body.conteudo_texto?.trim() ?? '';
  if (!titulo || !publico) {
    return NextResponse.json({ ok: false, erro: 'Título e público são obrigatórios' }, { status: 400 });
  }
  if (tipoConteudo === 'video' && !extrairYoutubeVideoId(videoUrl)) {
    return NextResponse.json({ ok: false, erro: 'Informe uma URL válida do YouTube.' }, { status: 400 });
  }
  if (tipoConteudo === 'texto' && !conteudoTexto) {
    return NextResponse.json({ ok: false, erro: 'Informe o texto do material.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const unidadeId = await unidadeIdPorSlug(supabase, slugUnidadeReferenciaPublico(publico));
    if (!unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Unidade de referência inválida' }, { status: 400 });
    }

    const baseInsert = {
      titulo,
      descricao: body.descricao?.trim() || null,
      publico_alvo: publico,
      unidade_id: unidadeId,
      exige_confirmacao: body.exige_confirmacao === true,
      ordem: Number(body.ordem) || 0,
      ativo: true,
    };

    const insertComTipo = {
      ...baseInsert,
      tipo_conteudo: tipoConteudo,
      conteudo_texto: tipoConteudo === 'texto' ? conteudoTexto : null,
      video_youtube_url: tipoConteudo === 'video' ? videoUrl : null,
    };

    let { data, error } = await supabase.from('treinamentos').insert(insertComTipo).select('id, titulo').single();

    if (error && /tipo_conteudo|conteudo_texto|schema cache/i.test(error.message)) {
      if (tipoConteudo === 'texto') {
        return NextResponse.json(
          { ok: false, erro: 'Materiais em texto exigem a migration 064 no Supabase.' },
          { status: 400 }
        );
      }
      ({ data, error } = await supabase
        .from('treinamentos')
        .insert({ ...baseInsert, video_youtube_url: videoUrl })
        .select('id, titulo')
        .single());
    }

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, treinamento: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
