import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  chaveTreinoAutomaticoColaborador,
  registrarVisualizacaoTreinoAutomatico,
} from '@/lib/treinamento-acompanhamento';
import { extrairYoutubeVideoId, resolverQuintaTreino } from '@/lib/graos/quinta-treino';

/** Registra visualização de treino automático (ex.: Quinta colaborador). */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { treino_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const treinoId = String(body.treino_id ?? '').trim();
  if (treinoId !== 'quinta-colaborador') {
    return NextResponse.json({ ok: false, erro: 'Treino automático inválido' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const quinta = resolverQuintaTreino(origin, 'colaborador');
  const videoId = quinta.youtube_video_id ?? extrairYoutubeVideoId(String(quinta.embed_url ?? ''));
  if (!videoId) {
    return NextResponse.json({ ok: false, erro: 'Treino não configurado' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await registrarVisualizacaoTreinoAutomatico(
      supabase,
      colaboradorId,
      chaveTreinoAutomaticoColaborador(videoId)
    );
    if (!resultado.ok) {
      return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
