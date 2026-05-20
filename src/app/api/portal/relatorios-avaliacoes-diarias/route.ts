import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';

/**
 * Avaliações semanais da equipe para /portal/relatorios-avaliacoes (data_referencia = segunda da semana).
 * Mesma regra de acesso que /api/portal/avaliacao-lideranca/relatorio (sócio/admin via portal).
 * Não usa isAdminAuthorized (evita divergência: sessão /admin por senha no PC vs só portal no telemóvel).
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
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
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    if (!podeVerRelatoriosAvaliacoesCompletos(role)) {
      return NextResponse.json(
        { ok: false, erro: 'Apenas sócio e administrativo podem consultar este relatório.' },
        { status: 403 }
      );
    }

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
      .select(
        'id, data_referencia, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, media_dia, justificativa_nota_baixa, colaborador_id, avaliador_id'
      )
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
    const metaPorId: Record<string, { nome: string; setor: string | null }> = {};
    if (idsNomes.size > 0) {
      const { data: pessoas, error: errP } = await supabase
        .from('colaboradores')
        .select('id, nome, setor')
        .in('id', Array.from(idsNomes));
      if (!errP && pessoas) {
        for (const p of pessoas) {
          metaPorId[p.id as string] = {
            nome: String(p.nome ?? ''),
            setor: (p as { setor?: string | null }).setor ?? null,
          };
        }
      }
    }

    const linhas = rows.map((r) => {
      const colabMeta = metaPorId[r.colaborador_id as string];
      return {
        id: r.id,
        data_referencia: r.data_referencia,
        assiduidade: r.assiduidade,
        nota_vestimenta: r.nota_vestimenta,
        nota_pontualidade: r.nota_pontualidade,
        nota_trabalho_equipe: r.nota_trabalho_equipe,
        nota_desempenho_tarefas: r.nota_desempenho_tarefas,
        media_dia: r.media_dia,
        justificativa_nota_baixa: (r as { justificativa_nota_baixa?: string | null }).justificativa_nota_baixa ?? null,
        colaborador_id: r.colaborador_id,
        colaborador_nome: colabMeta?.nome ?? null,
        colaborador_setor: colabMeta?.setor ?? null,
        avaliador_id: r.avaliador_id,
        avaliador_nome: metaPorId[r.avaliador_id as string]?.nome ?? null,
      };
    });

    return NextResponse.json({ ok: true, total: linhas.length, linhas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
