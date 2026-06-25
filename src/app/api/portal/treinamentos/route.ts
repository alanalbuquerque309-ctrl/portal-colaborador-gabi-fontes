import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  colaboradorRecebeAvisoPublico,
  resolverPublicoAviso,
} from '@/lib/avisos-publico';
import {
  extrairYoutubeVideoId,
  resolverQuintaTreino,
  urlEmbedYoutubeTreino,
} from '@/lib/graos/quinta-treino';
import {
  deveVerTreinoLiderancaPortal,
  normalizePortalRole,
  podeParticiparGraosCafe,
  podeVerTodosTreinosQuinta,
} from '@/lib/roles';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { liderConcluiuTreinoAtual } from '@/lib/treino-lider-acompanhamento';

async function liderConcluiuTreinoSeguro(
  supabase: ReturnType<typeof createAdminClient>,
  colaboradorId: string
): Promise<boolean> {
  try {
    return await liderConcluiuTreinoAtual(supabase, colaboradorId);
  } catch {
    return false;
  }
}

/** Lista treinamentos do colaborador + Quinta do café (env) + link vídeo institucional. */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, role, setor, unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const un = eu.unidades as { slug?: string } | { slug?: string }[] | null;
    const u = Array.isArray(un) ? un[0] : un;
    const perfilColab = {
      unidade_slug: u?.slug ?? '',
      setor: (eu.setor as string | null) ?? null,
      role: (eu.role as string | null) ?? null,
    };

    const { data: rows, error } = await supabase
      .from('treinamentos')
      .select('id, titulo, descricao, video_youtube_url, publico_alvo, exige_confirmacao, created_at, unidades:unidade_id(slug)')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });

    if (error && !/treinamentos|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const ids: string[] = [];
    const listaDb = (rows ?? []).filter((r) => {
      const unidade = r.unidades as { slug?: string } | null;
      const publico = resolverPublicoAviso(r.publico_alvo as string | null, unidade?.slug ?? null);
      const ok = colaboradorRecebeAvisoPublico(perfilColab, publico);
      if (ok) ids.push(String(r.id));
      return ok;
    });

    const visualMap = new Map<string, string>();
    const confMap = new Map<string, boolean>();
    if (ids.length > 0) {
      const { data: vis } = await supabase
        .from('treinamento_visualizacoes')
        .select('treinamento_id, visualizado_em')
        .eq('colaborador_id', colaboradorId)
        .in('treinamento_id', ids);
      for (const v of vis ?? []) visualMap.set(String(v.treinamento_id), String(v.visualizado_em));

      const { data: conf } = await supabase
        .from('treinamento_confirmacoes')
        .select('treinamento_id')
        .eq('colaborador_id', colaboradorId)
        .in('treinamento_id', ids);
      for (const c of conf ?? []) confMap.set(String(c.treinamento_id), true);
    }

    const origin = new URL(req.url).origin;
    const treinamentos = listaDb.map((r) => {
      const videoId = extrairYoutubeVideoId(String(r.video_youtube_url ?? ''));
      return {
        id: String(r.id),
        tipo: 'cadastro' as const,
        titulo: String(r.titulo ?? ''),
        descricao: r.descricao ? String(r.descricao) : null,
        exige_confirmacao: r.exige_confirmacao === true,
        visualizado: visualMap.has(String(r.id)),
        confirmado: confMap.has(String(r.id)),
        embed_url: videoId ? urlEmbedYoutubeTreino(videoId, origin) : null,
        created_at: r.created_at,
      };
    });

    const extras: typeof treinamentos = [];

    const role = normalizePortalRole((eu as { role?: string }).role);
    let podeAvaliacaoEquipe = false;
    try {
      podeAvaliacaoEquipe = await podeUsarAvaliacaoEquipeSemanal(supabase, colaboradorId, role);
    } catch {
      podeAvaliacaoEquipe = false;
    }
    const verTreinoLider = deveVerTreinoLiderancaPortal(role, podeAvaliacaoEquipe);
    const verTodosTreinos = podeVerTodosTreinosQuinta(role);
    const participaGraos = podeParticiparGraosCafe(role);

    const quintaColaborador = resolverQuintaTreino(origin, 'colaborador');
    if (quintaColaborador.embed_url) {
      extras.push({
        id: 'quinta-colaborador',
        tipo: 'cadastro' as const,
        titulo: quintaColaborador.titulo,
        descricao: quintaColaborador.resumo,
        exige_confirmacao: false,
        visualizado: verTodosTreinos ? false : true,
        confirmado: false,
        embed_url: quintaColaborador.embed_url,
        created_at: null,
      });
    }

    if (verTreinoLider) {
      const quintaLider = resolverQuintaTreino(origin, 'lider');
      const concluiuTreinoLider = await liderConcluiuTreinoSeguro(supabase, colaboradorId);
      if (quintaLider.embed_url) {
        extras.push({
          id: 'quinta-lider',
          tipo: 'cadastro' as const,
          titulo: quintaLider.titulo,
          descricao: quintaLider.resumo,
          exige_confirmacao: true,
          visualizado: concluiuTreinoLider,
          confirmado: concluiuTreinoLider,
          embed_url: quintaLider.embed_url,
          created_at: null,
        });
      }
    }

    extras.push({
      id: 'video-institutional',
      tipo: 'cadastro' as const,
      titulo: 'Vídeo institucional — boas-vindas',
      descricao: 'Vídeo de cultura e boas-vindas da Gabi Fontes.',
      exige_confirmacao: false,
      visualizado: false,
      confirmado: false,
      embed_url: null,
      created_at: null,
    });

    return NextResponse.json({
      ok: true,
      treinamentos: [...treinamentos, ...extras],
      links: {
        video_boas_vindas: '/portal/video-boas-vindas',
        manuais: '/portal/manuais',
        graos_quinta: participaGraos ? '/portal/graos' : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
