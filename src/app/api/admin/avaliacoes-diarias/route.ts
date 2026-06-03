import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { podeVerDetalheNotasAvaliacaoAdmin } from '@/lib/admin-access';
import { requireAdminFullApi } from '@/lib/admin-auth';
import {
  construirConjuntoIdsRh,
  rotuloAvaliadorRelatorio,
} from '@/lib/avaliacao-semanal-agregacao';
import { isAvaliacaoDeVisitaRh } from '@/lib/avaliacao-rh-visita-access';
import { queryAvaliacoesDiariasAdmin } from '@/lib/avaliacoes-justificativa-compat';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Relatório consolidado de avaliações semanais da equipe — apenas painel admin (administrativo / sócio).
 * `data_referencia` na tabela é a segunda-feira da semana. Gerentes não utilizam esta rota.
 */
export async function GET(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

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
    const role = auth.ctx.kind === 'portal' ? auth.ctx.role : null;
    const senhaAdmin = auth.ctx.kind === 'password_session';
    const incluirDetalhe = podeVerDetalheNotasAvaliacaoAdmin(role, senhaAdmin);

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
        return NextResponse.json({ ok: true, total: 0, linhas: [], pode_ver_detalhe: incluirDetalhe });
      }
    }

    const { data: rows, error: errQuery } = await queryAvaliacoesDiariasAdmin(incluirDetalhe, async (select) => {
      let q = supabase
        .from('avaliacoes_diarias')
        .select(select)
        .gte('data_referencia', inicio)
        .lte('data_referencia', fim)
        .order('data_referencia', { ascending: false })
        .limit(limite);
      if (idsFiltro) q = q.in('colaborador_id', idsFiltro);
      return await q;
    });

    if (errQuery) {
      return NextResponse.json({ ok: false, erro: errQuery }, { status: 500 });
    }

    const idsNomes = new Set<string>();
    for (const r of rows) {
      idsNomes.add(r.colaborador_id as string);
      idsNomes.add(r.avaliador_id as string);
    }

    const metaPorId: Record<
      string,
      {
        nome: string;
        setor: string | null;
        cargo: string | null;
        role: string | null;
        unidade_nome: string | null;
      }
    > = {};

    if (idsNomes.size > 0) {
      const { data: pessoas, error: errP } = await supabase
        .from('colaboradores')
        .select('id, nome, setor, cargo, role, unidade_id, unidades(nome, slug)')
        .in('id', Array.from(idsNomes));
      if (!errP && pessoas) {
        for (const p of pessoas) {
          const unidade = Array.isArray(p.unidades) ? p.unidades[0] : p.unidades;
          const unidadeNome =
            unidade && typeof unidade === 'object' && 'nome' in unidade
              ? String((unidade as { nome?: string }).nome ?? '')
              : null;
          metaPorId[p.id as string] = {
            nome: String(p.nome ?? ''),
            setor: (p as { setor?: string | null }).setor ?? null,
            cargo: (p as { cargo?: string | null }).cargo ?? null,
            role: normalizePortalRole((p as { role?: string | null }).role),
            unidade_nome: unidadeNome,
          };
        }
      }
    }

    const rhIds = construirConjuntoIdsRh(
      Object.entries(metaPorId).map(([id, m]) => ({
        id,
        role: m.role,
        setor: m.setor,
        nome: m.nome,
      }))
    );

    const linhas = rows.map((r) => {
      const colabMeta = metaPorId[r.colaborador_id as string];
      const avalMeta = metaPorId[r.avaliador_id as string];
      const avaliadorId = String(r.avaliador_id);
      const avaliadorRole = avalMeta?.role ?? null;
      const avaliadorNome = avalMeta?.nome ?? null;
      const origemVisitaRh = isAvaliacaoDeVisitaRh(avaliadorId, avaliadorRole, rhIds);

      return {
        id: r.id,
        data_referencia: r.data_referencia,
        assiduidade: r.assiduidade,
        media_dia: r.media_dia,
        justificativa_nota_baixa: (r as { justificativa_nota_baixa?: string | null }).justificativa_nota_baixa ?? null,
        colaborador_id: r.colaborador_id,
        colaborador_nome: colabMeta?.nome ?? null,
        colaborador_setor: colabMeta?.setor ?? null,
        colaborador_cargo: colabMeta?.cargo ?? null,
        colaborador_unidade_nome: colabMeta?.unidade_nome ?? null,
        avaliador_id: r.avaliador_id,
        avaliador_nome: avaliadorNome,
        avaliador_rotulo: rotuloAvaliadorRelatorio(avaliadorId, avaliadorRole, avaliadorNome, rhIds),
        origem_visita_rh: origemVisitaRh,
        ...(incluirDetalhe
          ? {
              nota_vestimenta: (r as { nota_vestimenta?: number | null }).nota_vestimenta ?? null,
              nota_pontualidade: (r as { nota_pontualidade?: number | null }).nota_pontualidade ?? null,
              nota_trabalho_equipe: (r as { nota_trabalho_equipe?: number | null }).nota_trabalho_equipe ?? null,
              nota_desempenho_tarefas:
                (r as { nota_desempenho_tarefas?: number | null }).nota_desempenho_tarefas ?? null,
              nota_proatividade: (r as { nota_proatividade?: number | null }).nota_proatividade ?? null,
            }
          : {}),
      };
    });

    return NextResponse.json({ ok: true, total: linhas.length, linhas, pode_ver_detalhe: incluirDetalhe });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
