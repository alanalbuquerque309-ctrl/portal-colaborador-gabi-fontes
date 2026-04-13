import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Relatório consolidado de avaliações diárias — apenas painel admin (administrativo / sócio).
 * Gerentes não utilizam esta rota.
 */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get('inicio')?.trim();
  const fim = searchParams.get('fim')?.trim();
  const unidadeIdParam = searchParams.get('unidade_id')?.trim();
  const unidadeSlug = searchParams.get('unidade_slug')?.trim();
  const limite = Math.min(2000, Math.max(50, Number(searchParams.get('limite')) || 500));

  if (!inicio || !/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !fim || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return NextResponse.json(
      { ok: false, erro: 'Parâmetros inicio e fim obrigatórios (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    let unidadeId = unidadeIdParam;
    if (!unidadeId && unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id').eq('slug', unidadeSlug).maybeSingle();
      if (u?.id) unidadeId = String(u.id);
    }

    let idsFiltro: string[] | null = null;
    if (unidadeId) {
      const { data: idsUn, error: errUn } = await supabase.from('colaboradores').select('id').eq('unidade_id', unidadeId);
      if (errUn) {
        return NextResponse.json({ ok: false, erro: errUn.message }, { status: 500 });
      }
      idsFiltro = (idsUn ?? []).map((r) => r.id as string);
      if (idsFiltro.length === 0) {
        return NextResponse.json({ ok: true, total: 0, linhas: [] });
      }
    }

    let q = supabase
      .from('avaliacoes_diarias')
      .select('id, data_referencia, assiduidade, media_dia, colaborador_id, avaliador_id')
      .gte('data_referencia', inicio)
      .lte('data_referencia', fim)
      .order('data_referencia', { ascending: false })
      .limit(limite);

    if (idsFiltro) {
      q = q.in('colaborador_id', idsFiltro);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const idsNomes = new Set<string>();
    for (const r of rows) {
      idsNomes.add(r.colaborador_id as string);
      idsNomes.add(r.avaliador_id as string);
    }
    const nomePorId: Record<string, string> = {};
    if (idsNomes.size > 0) {
      const { data: pessoas, error: errP } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .in('id', Array.from(idsNomes));
      if (!errP && pessoas) {
        for (const p of pessoas) {
          nomePorId[p.id as string] = String(p.nome ?? '');
        }
      }
    }

    const linhas = rows.map((r) => ({
      id: r.id,
      data_referencia: r.data_referencia,
      assiduidade: r.assiduidade,
      media_dia: r.media_dia,
      colaborador_id: r.colaborador_id,
      colaborador_nome: nomePorId[r.colaborador_id as string] ?? null,
      avaliador_id: r.avaliador_id,
      avaliador_nome: nomePorId[r.avaliador_id as string] ?? null,
    }));

    return NextResponse.json({ ok: true, total: linhas.length, linhas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
