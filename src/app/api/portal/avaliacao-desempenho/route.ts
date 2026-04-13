import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  AVALIACAO_RANKING_MIN_DIAS,
  mediaMensalColaborador,
  topTresComEmpateNoTerceiro,
  type ScoreMensal,
} from '@/lib/avaliacao-ranking';

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

    const { data: minhasLinhas } = await supabase
      .from('avaliacoes_diarias')
      .select('media_dia')
      .eq('colaborador_id', colaboradorId)
      .gte('data_referencia', ini)
      .lte('data_referencia', fim);

    const agg = mediaMensalColaborador(
      (minhasLinhas ?? []).map((r) => ({ media_dia: r.media_dia as number | null }))
    );
    const meu_desempenho = {
      nome: String(eu.nome ?? ''),
      media_mes: agg.media,
      dias_com_avaliacao: agg.dias,
    };

    if (idsRanking.length === 0) {
      return NextResponse.json({
        ok: true,
        mes_referencia: `${ano}-${String(mes).padStart(2, '0')}`,
        min_dias_ranking: AVALIACAO_RANKING_MIN_DIAS,
        top_unidade: [],
        meu_desempenho,
        nota_privacidade:
          'Reconhecimento interno: destaque dos melhores desempenhos da unidade no mês. O seu resultado é exibido apenas para si, sem comparação direta nem posição no ranking.',
      });
    }

    const { data: linhas, error: errLin } = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, media_dia, data_referencia')
      .in('colaborador_id', idsRanking)
      .gte('data_referencia', ini)
      .lte('data_referencia', fim);

    if (errLin) {
      return NextResponse.json({ ok: false, erro: errLin.message }, { status: 500 });
    }

    const porColab: Record<string, { media_dia: number | null }[]> = {};
    for (const id of idsRanking) porColab[id] = [];
    for (const row of linhas ?? []) {
      const cid = row.colaborador_id as string;
      if (!porColab[cid]) continue;
      porColab[cid].push({ media_dia: row.media_dia as number | null });
    }

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

    return NextResponse.json({
      ok: true,
      mes_referencia: `${ano}-${String(mes).padStart(2, '0')}`,
      min_dias_ranking: AVALIACAO_RANKING_MIN_DIAS,
      top_unidade,
      meu_desempenho,
      nota_privacidade:
        'Reconhecimento interno: destaque dos melhores desempenhos da unidade no mês. O seu resultado é exibido apenas para si, sem comparação direta nem posição no ranking.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
