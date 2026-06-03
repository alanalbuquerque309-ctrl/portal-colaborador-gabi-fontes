import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  agruparMediasPorColaborador,
  AVALIACAO_RANKING_MIN_SEMANAS,
  inicioDataReferenciaRanking,
  mediaMensalColaborador,
  topTresComEmpateNoTerceiro,
  type ScoreMensal,
} from '@/lib/avaliacao-ranking';
import { filtrarAvaliacoesParaMedia } from '@/lib/avaliacao-ignorada';
import { montarContextoConsolidacaoRanking } from '@/lib/avaliacao-ranking-contexto';
import { fraseMotivacionalDesempenho, motivacaoSemanalPorPontuacao } from '@/lib/frases-motivacao-desempenho';

function mesBoundsUTC(ano: number, mes: number): { ini: string; fim: string } {
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimo = new Date(Date.UTC(ano, mes, 0));
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimo.getUTCDate()).padStart(2, '0')}`;
  return { ini, fim };
}

/** Ranking da unidade (top 3 + empate) e só o próprio desempenho — sem posição global. */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mesParam = searchParams.get('mes')?.trim() ?? '';
  let ano: number;
  let mes: number;
  if (/^\d{4}-\d{2}$/.test(mesParam)) {
    const [y, m] = mesParam.split('-').map(Number);
    ano = y;
    mes = m;
  } else {
    const d = new Date();
    ano = d.getFullYear();
    mes = d.getMonth() + 1;
  }
  if (mes < 1 || mes > 12) {
    return NextResponse.json({ ok: false, erro: 'Mês inválido' }, { status: 400 });
  }

  const { ini, fim } = mesBoundsUTC(ano, mes);

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, nome, unidade_id, role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const meuRole = String((eu as { role?: string }).role || '').toLowerCase();
    if (meuRole !== 'colaborador') {
      return NextResponse.json(
        { ok: false, erro: 'Ranking e desempenho do portal são apenas para colaboradores' },
        { status: 403 }
      );
    }

    const unidadeId = eu.unidade_id as string;

    const { data: colegas, error: errCol } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .eq('unidade_id', unidadeId)
      .eq('role', 'colaborador');

    if (errCol) {
      return NextResponse.json({ ok: false, erro: errCol.message }, { status: 500 });
    }

    const idsRanking = (colegas ?? []).map((c) => c.id as string);

    const refMin = inicioDataReferenciaRanking(ini);

    const { data: minhasLinhas } = await supabase
      .from('avaliacoes_diarias')
      .select('avaliador_id, data_referencia, media_dia, created_at')
      .eq('colaborador_id', colaboradorId)
      .gte('data_referencia', refMin)
      .lte('data_referencia', fim);

    const minhasMapeadas = filtrarAvaliacoesParaMedia(
      (minhasLinhas ?? []).map((r) => ({
        colaborador_id: colaboradorId,
        avaliador_id: r.avaliador_id != null ? String(r.avaliador_id) : null,
        data_referencia: String(r.data_referencia),
        media_dia: r.media_dia as number | null,
        created_at: r.created_at != null ? String(r.created_at) : null,
        ignorada: (r as { ignorada?: boolean }).ignorada,
      }))
    );
    const ctxEu = await montarContextoConsolidacaoRanking(supabase, minhasMapeadas);

    const agg = mediaMensalColaborador(
      agruparMediasPorColaborador(minhasMapeadas, [colaboradorId], ini, ctxEu)[colaboradorId] ??
        []
    );
    const meu_desempenho = {
      nome: String(eu.nome ?? ''),
      media_mes: agg.media,
      dias_com_avaliacao: agg.dias,
    };

    const mesRef = `${ano}-${String(mes).padStart(2, '0')}`;

    if (idsRanking.length === 0) {
      return NextResponse.json({
        ok: true,
        mes_referencia: mesRef,
        min_semanas_ranking: AVALIACAO_RANKING_MIN_SEMANAS,
        top_unidade: [],
        media_media_top3: null,
        frase_motivacional: fraseMotivacionalDesempenho(meu_desempenho.media_mes),
        motivacao_visual: motivacaoSemanalPorPontuacao(meu_desempenho.media_mes),
        meu_desempenho,
        nota_privacidade:
          'Reconhecimento interno: destaque dos melhores desempenhos da unidade no mês. O seu resultado é exibido apenas para si, sem comparação direta nem posição no ranking.',
      });
    }

    const { data: linhas, error: errLin } = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, avaliador_id, media_dia, data_referencia, created_at')
      .in('colaborador_id', idsRanking)
      .gte('data_referencia', refMin)
      .lte('data_referencia', fim);

    if (errLin) {
      return NextResponse.json({ ok: false, erro: errLin.message }, { status: 500 });
    }

    const linhasMapeadas = filtrarAvaliacoesParaMedia(
      (linhas ?? []).map((row) => ({
        colaborador_id: String(row.colaborador_id),
        avaliador_id: row.avaliador_id != null ? String(row.avaliador_id) : null,
        data_referencia: String(row.data_referencia),
        media_dia: row.media_dia as number | null,
        created_at: row.created_at != null ? String(row.created_at) : null,
        ignorada: (row as { ignorada?: boolean }).ignorada,
      }))
    );
    const ctxRanking = await montarContextoConsolidacaoRanking(supabase, linhasMapeadas);

    const porColab = agruparMediasPorColaborador(linhasMapeadas, idsRanking, ini, ctxRanking);

    const nomePorId = Object.fromEntries((colegas ?? []).map((c) => [c.id, String(c.nome ?? '')]));

    const scored: ScoreMensal[] = idsRanking.map((id) => {
      const { media, dias } = mediaMensalColaborador(porColab[id] ?? []);
      return {
        id,
        nome: nomePorId[id] || '—',
        media: media ?? 0,
        dias,
      };
    });

    const top_unidade = topTresComEmpateNoTerceiro(scored);

    const mediasTop = top_unidade.map((t) => t.media);
    const media_media_top3 =
      mediasTop.length > 0
        ? Math.round((mediasTop.reduce((a, b) => a + b, 0) / mediasTop.length) * 100) / 100
        : null;

    return NextResponse.json({
      ok: true,
      mes_referencia: mesRef,
      min_semanas_ranking: AVALIACAO_RANKING_MIN_SEMANAS,
      top_unidade,
      media_media_top3,
      frase_motivacional: fraseMotivacionalDesempenho(meu_desempenho.media_mes),
      motivacao_visual: motivacaoSemanalPorPontuacao(meu_desempenho.media_mes),
      meu_desempenho,
      nota_privacidade:
        'Reconhecimento interno: destaque dos melhores desempenhos da unidade no mês. O seu resultado é exibido apenas para si, sem comparação direta nem posição no ranking.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
