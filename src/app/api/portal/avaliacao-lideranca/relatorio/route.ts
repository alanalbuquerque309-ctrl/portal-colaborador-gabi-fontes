import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';

/**
 * Relatório de avaliações da liderança (uso no consolidado por filial).
 * Apenas sócios (portal). Não lista linhas em que o avaliado é o próprio usuário.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() ?? '';
  const inicio = searchParams.get('inicio')?.trim();
  const fim = searchParams.get('fim')?.trim();

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, unidade_id, role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = String((eu as { role?: string }).role || '').toLowerCase();
    if (!podeVerRelatoriosAvaliacoesCompletos(role)) {
      return NextResponse.json(
        { ok: false, erro: 'Apenas sócios podem consultar este relatório.' },
        { status: 403 }
      );
    }

    let unidadeIdFilter: string | null = null;
    if (unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id, nome, slug').eq('slug', unidadeSlug).maybeSingle();
      if (!u?.id) {
        return NextResponse.json({ ok: false, erro: 'Unidade não encontrada' }, { status: 400 });
      }
      unidadeIdFilter = String(u.id);
    }

    let q = supabase
      .from('avaliacoes_lideranca')
      .select(
        'id, unidade_id, semana_inicio, anonimo, n_fala_escuta, n_apoio, n_ambiente, n_organizacao, created_at, avaliado_id, avaliador_id'
      )
      .neq('avaliado_id', colaboradorId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (unidadeIdFilter) {
      q = q.eq('unidade_id', unidadeIdFilter);
    }
    if (inicio && /^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
      q = q.gte('created_at', `${inicio}T00:00:00.000Z`);
    }
    if (fim && /^\d{4}-\d{2}-\d{2}$/.test(fim)) {
      q = q.lte('created_at', `${fim}T23:59:59.999Z`);
    }

    const { data: rows, error: errRows } = await q;

    if (errRows) {
      return NextResponse.json({ ok: false, erro: errRows.message }, { status: 500 });
    }

    const list = rows ?? [];
    const uids = Array.from(new Set(list.map((r) => r.unidade_id as string).filter(Boolean)));
    let unidadeMeta: Record<string, { nome: string; slug: string }> = {};
    if (uids.length > 0) {
      const { data: uns } = await supabase.from('unidades').select('id, nome, slug').in('id', uids);
      unidadeMeta = Object.fromEntries(
        (uns ?? []).map((x) => [
          x.id as string,
          { nome: String(x.nome ?? ''), slug: String(x.slug ?? '') },
        ])
      );
    }

    const ids = Array.from(
      new Set(list.flatMap((r) => [r.avaliado_id, r.avaliador_id].filter(Boolean) as string[]))
    );
    let nomePorId: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: pessoas } = await supabase.from('colaboradores').select('id, nome').in('id', ids);
      nomePorId = Object.fromEntries((pessoas ?? []).map((p) => [p.id as string, String(p.nome ?? '')]));
    }

    const itens = list.map((r) => {
      const uid = r.unidade_id as string;
      const meta = unidadeMeta[uid];
      const media =
        ((r.n_fala_escuta as number) +
          (r.n_apoio as number) +
          (r.n_ambiente as number) +
          (r.n_organizacao as number)) /
        4;
      const avaliadoNome = nomePorId[r.avaliado_id as string] ?? '—';
      const avaliadorNome = r.anonimo
        ? 'Colaborador (anônimo)'
        : nomePorId[r.avaliador_id as string] ?? '—';
      return {
        id: r.id,
        unidade_id: uid,
        filial_nome: meta?.nome ?? '—',
        filial_slug: meta?.slug ?? '',
        semana_inicio: r.semana_inicio,
        created_at: r.created_at,
        avaliado_nome: avaliadoNome,
        avaliador_label: avaliadorNome,
        n_fala_escuta: r.n_fala_escuta,
        n_apoio: r.n_apoio,
        n_ambiente: r.n_ambiente,
        n_organizacao: r.n_organizacao,
        media: Math.round(media * 100) / 100,
      };
    });

    return NextResponse.json({
      ok: true,
      nota:
        'Feedback sobre gerência e administrativo. Não são exibidas avaliações em que você é o avaliado. Use filtros de data e filial conforme necessário.',
      itens,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
