import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalRhVisitaSession } from '@/lib/portal-rh-visita-session';
import { listarRedeParaVisitaRh } from '@/lib/avaliacao-rh-visita';
import { colaboradorElegivelVisitaRh } from '@/lib/avaliacao-rh-visita-access';
import { insertAvaliacaoDiariaCompat } from '@/lib/avaliacoes-justificativa-compat';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';
import { isDateIsoAvaliacao } from '@/lib/avaliacao-semanal-shared';
import { validarBodyAvaliacaoSemanal } from '@/lib/avaliacao-semanal-submit';

/** Visita RH: lista da rede + avaliação complementar (independente do gerente). */
export async function GET(req: Request) {
  const auth = await requirePortalRhVisitaSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dataRefRaw = searchParams.get('data')?.trim() ?? '';
  if (!isDateIsoAvaliacao(dataRefRaw)) {
    return NextResponse.json({ ok: false, erro: 'Parâmetro data inválido (use YYYY-MM-DD)' }, { status: 400 });
  }
  const dataRef = inicioSemanaSegundaFeiraLocal(dataRefRaw);
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() ?? '';
  const setor = searchParams.get('setor')?.trim() ?? '';
  const q = searchParams.get('q')?.trim() ?? '';

  try {
    const supabase = createAdminClient();
    const { colaboradorId } = auth.ctx;
    const rede = await listarRedeParaVisitaRh(supabase, colaboradorId, {
      unidade_slug: unidadeSlug || undefined,
      setor: setor || undefined,
      q: q || undefined,
    });

    const ids = rede.map((c) => c.id);
    const avalRh: Record<string, Record<string, unknown>> = {};
    const outrasCount: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: rows, error } = await supabase
        .from('avaliacoes_diarias')
        .select(
          'colaborador_id, avaliador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, media_dia, justificativa_nota_baixa'
        )
        .eq('data_referencia', dataRef)
        .in('colaborador_id', ids);

      if (error) {
        return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      }

      for (const id of ids) outrasCount[id] = 0;
      for (const row of rows ?? []) {
        const cid = String(row.colaborador_id);
        const aid = String(row.avaliador_id);
        if (aid === colaboradorId) {
          avalRh[cid] = row as Record<string, unknown>;
        } else {
          outrasCount[cid] = (outrasCount[cid] ?? 0) + 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data_referencia: dataRef,
      equipe: rede.map((c) => ({
        ...c,
        avaliacao: avalRh[c.id] ?? null,
        outras_avaliacoes_semana: outrasCount[c.id] ?? 0,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Primeiro envio da visita RH na semana; não bloqueia avaliação do gerente. */
export async function POST(req: Request) {
  const auth = await requirePortalRhVisitaSession();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const dataRefRaw = String(body.data_referencia ?? '').trim();
  if (!isDateIsoAvaliacao(dataRefRaw)) {
    return NextResponse.json({ ok: false, erro: 'Data inválida' }, { status: 400 });
  }
  const dataRef = inicioSemanaSegundaFeiraLocal(dataRefRaw);

  const validado = validarBodyAvaliacaoSemanal(body, dataRef);
  if (!validado.ok) {
    return NextResponse.json({ ok: false, erro: validado.erro }, { status: validado.status });
  }

  try {
    const supabase = createAdminClient();
    const { colaboradorId } = auth.ctx;

    if (validado.colaboradorAlvo === colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Não é possível autoavaliar' }, { status: 400 });
    }

    const { data: alvo } = await supabase
      .from('colaboradores')
      .select('id, nome, role')
      .eq('id', validado.colaboradorAlvo)
      .maybeSingle();

    if (!alvo?.id || !colaboradorElegivelVisitaRh(alvo, colaboradorId)) {
      return NextResponse.json(
        { ok: false, erro: 'Pessoa fora do escopo da visita RH.' },
        { status: 403 }
      );
    }

    const { data: existente } = await supabase
      .from('avaliacoes_diarias')
      .select('id')
      .eq('colaborador_id', validado.colaboradorAlvo)
      .eq('avaliador_id', colaboradorId)
      .eq('data_referencia', dataRef)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          erro: 'Você já registrou a visita RH desta pessoa nesta semana. Para correção, contacte o administrativo.',
        },
        { status: 409 }
      );
    }

    const row = { ...validado.row, avaliador_id: colaboradorId };
    const { error: insErr } = await insertAvaliacaoDiariaCompat(supabase, row);
    if (insErr) {
      return NextResponse.json({ ok: false, erro: insErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true, media_dia: validado.media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
