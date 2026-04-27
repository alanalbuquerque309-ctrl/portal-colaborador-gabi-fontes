import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { AVALIACAO_RANKING_MIN_DIAS } from '@/lib/avaliacao-ranking';

function mesAtualBoundsUTC(): { ini: string; fim: string; mesRef: string } {
  const d = new Date();
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + 1;
  const ini = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${ano}-${String(mes).padStart(2, '0')}` };
}

/** Destaque automático do mês (geral e por unidade), baseado nas avaliações diárias. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { ini, fim, mesRef } = mesAtualBoundsUTC();

    const { data: linhas, error: errLinhas } = await supabase
      .from('avaliacoes_diarias')
      .select('colaborador_id, media_dia')
      .gte('data_referencia', ini)
      .lte('data_referencia', fim)
      .not('media_dia', 'is', null)
      .limit(8000);

    if (errLinhas) return NextResponse.json({ ok: false, erro: errLinhas.message }, { status: 500 });
    if (!linhas || linhas.length === 0) {
      return NextResponse.json({
        ok: true,
        destaque: null,
        destaque_geral: null,
        destaques_unidade: [],
        mes_referencia: mesRef,
      });
    }

    const porColab: Record<string, number[]> = {};
    for (const l of linhas) {
      const cid = String(l.colaborador_id ?? '');
      if (!cid) continue;
      if (!porColab[cid]) porColab[cid] = [];
      porColab[cid].push(Number(l.media_dia));
    }

    const ids = Object.keys(porColab);
    const { data: cols, error: errCols } = await supabase
      .from('colaboradores')
      .select('id, nome, foto_url, role, unidade_id, unidades(nome, slug)')
      .in('id', ids);
    if (errCols) return NextResponse.json({ ok: false, erro: errCols.message }, { status: 500 });

    const candidatos = (cols ?? [])
      .map((c) => {
        const notas = porColab[String(c.id)] ?? [];
        const dias = notas.length;
        const media = dias > 0 ? notas.reduce((a, b) => a + b, 0) / dias : 0;
        const unidade = Array.isArray(c.unidades) ? c.unidades[0] : c.unidades;
        return {
          id: String(c.id),
          colaborador_nome: String(c.nome ?? ''),
          colaborador_foto: c.foto_url ? String(c.foto_url) : null,
          role: String(c.role ?? '').toLowerCase(),
          unidade_id: c.unidade_id ? String(c.unidade_id) : null,
          unidade_nome: unidade?.nome ? String(unidade.nome) : null,
          unidade_slug: unidade?.slug ? String(unidade.slug) : null,
          dias_avaliados: dias,
          media_mes: Math.round(media * 100) / 100,
        };
      })
      .filter((c) => c.role === 'colaborador' && c.dias_avaliados >= AVALIACAO_RANKING_MIN_DIAS);

    if (candidatos.length === 0) {
      return NextResponse.json({
        ok: true,
        destaque: null,
        destaque_geral: null,
        destaques_unidade: [],
        mes_referencia: mesRef,
      });
    }

    const ordenar = (a: (typeof candidatos)[number], b: (typeof candidatos)[number]) =>
      b.media_mes - a.media_mes || a.colaborador_nome.localeCompare(b.colaborador_nome, 'pt-BR');
    const gerais = [...candidatos].sort(ordenar);
    const destaqueGeral = gerais[0];

    const toDestaque = (item: (typeof candidatos)[number], tipo: 'geral' | 'unidade') => ({
      id: item.id,
      titulo: tipo === 'geral' ? 'Destaque do mês (Geral)' : 'Destaque do mês',
      descricao: `Média ${item.media_mes.toFixed(2)} em ${item.dias_avaliados} dia(s) avaliados no mês.`,
      colaborador_id: item.id,
      colaborador_nome: item.colaborador_nome,
      colaborador_foto: item.colaborador_foto,
      unidade_id: item.unidade_id,
      unidade_nome: item.unidade_nome,
      unidade_slug: item.unidade_slug,
      media_mes: item.media_mes,
      dias_avaliados: item.dias_avaliados,
      mes_referencia: mesRef,
    });

    const porUnidade = new Map<string, (typeof candidatos)[number]>();
    for (const item of gerais) {
      const key = String(item.unidade_slug ?? '');
      if (!key || porUnidade.has(key)) continue;
      porUnidade.set(key, item);
    }

    return NextResponse.json({
      ok: true,
      // Compatibilidade com componentes antigos.
      destaque: toDestaque(destaqueGeral, 'geral'),
      destaque_geral: toDestaque(destaqueGeral, 'geral'),
      destaques_unidade: Array.from(porUnidade.values()).map((d) => toDestaque(d, 'unidade')),
      mes_referencia: mesRef,
      min_dias_ranking: AVALIACAO_RANKING_MIN_DIAS,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
