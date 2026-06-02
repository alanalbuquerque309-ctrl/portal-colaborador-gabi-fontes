import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalGerenteSession } from '@/lib/portal-gerente-session';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import {
  insertAvaliacaoDiariaCompat,
  selectAvaliacoesDiariasPorColaboradores,
  updateAvaliacaoDiariaCompat,
} from '@/lib/avaliacoes-justificativa-compat';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';
import { isDateIsoAvaliacao } from '@/lib/avaliacao-semanal-shared';
import { validarBodyAvaliacaoSemanal } from '@/lib/avaliacao-semanal-submit';

/** Equipe do gerente + avaliações já salvas na semana (segunda de `data`); leitura após envio. */
export async function GET(req: Request) {
  const auth = await requirePortalGerenteSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dataRefRaw = searchParams.get('data')?.trim() ?? '';
  if (!isDateIsoAvaliacao(dataRefRaw)) {
    return NextResponse.json({ ok: false, erro: 'Parâmetro data inválido (use YYYY-MM-DD)' }, { status: 400 });
  }
  const dataRef = inicioSemanaSegundaFeiraLocal(dataRefRaw);

  try {
    const supabase = createAdminClient();
    const { colaboradorId, unidadeId } = auth.ctx;

    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, colaboradorId, unidadeId);

    const ids = equipe.map((c) => c.id);
    let avaliacoesPorColab: Record<string, Record<string, unknown>> = {};

    if (ids.length > 0) {
      const { rows: avalRows, error: errAval } = await selectAvaliacoesDiariasPorColaboradores(
        supabase,
        dataRef,
        ids,
        colaboradorId
      );
      if (errAval) {
        return NextResponse.json({ ok: false, erro: errAval }, { status: 500 });
      }
      avaliacoesPorColab = Object.fromEntries(avalRows.map((r) => [r.colaborador_id, r]));
    }

    return NextResponse.json({
      ok: true,
      data_referencia: dataRef,
      equipe: equipe.map((c) => ({
        ...c,
        avaliacao: avaliacoesPorColab[c.id] ?? null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Primeiro envio da avaliação deste avaliador na semana; visita RH pode coexistir. */
export async function POST(req: Request) {
  const auth = await requirePortalGerenteSession();
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
    const { colaboradorId, unidadeId } = auth.ctx;

    if (validado.colaboradorAlvo === colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Não é possível autoavaliar' }, { status: 400 });
    }

    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, colaboradorId, unidadeId);
    const sub = equipe.find((membro) => membro.id === validado.colaboradorAlvo);
    if (!sub) {
      return NextResponse.json(
        {
          ok: false,
          erro: 'Colaborador não encontrado na sua equipe para esta semana.',
        },
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
          erro:
            'Você já enviou a avaliação desta pessoa nesta semana. Para correção, contacte o administrativo/RH.',
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

/** Uma única correção por colaborador/semana pelo mesmo avaliador. */
export async function PATCH(req: Request) {
  const auth = await requirePortalGerenteSession();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const avaliacaoId = String(body.avaliacao_id ?? '').trim();
  if (!avaliacaoId) {
    return NextResponse.json({ ok: false, erro: 'avaliacao_id obrigatório' }, { status: 400 });
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
    const { colaboradorId, unidadeId } = auth.ctx;

    const { data: existente, error: errExistente } = await supabase
      .from('avaliacoes_diarias')
      .select('id, colaborador_id, avaliador_id, data_referencia, edicao_utilizada')
      .eq('id', avaliacaoId)
      .maybeSingle();

    if (errExistente && !/edicao_utilizada/i.test(errExistente.message)) {
      return NextResponse.json({ ok: false, erro: errExistente.message }, { status: 500 });
    }

    let rowExistente = existente;
    if (errExistente || !rowExistente) {
      const fallback = await supabase
        .from('avaliacoes_diarias')
        .select('id, colaborador_id, avaliador_id, data_referencia')
        .eq('id', avaliacaoId)
        .maybeSingle();
      if (fallback.error || !fallback.data) {
        return NextResponse.json({ ok: false, erro: 'Avaliação não encontrada.' }, { status: 404 });
      }
      rowExistente = { ...fallback.data, edicao_utilizada: false };
    }

    if (String(rowExistente.avaliador_id) !== colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Sem permissão para editar esta avaliação.' }, { status: 403 });
    }
    if (String(rowExistente.data_referencia) !== dataRef) {
      return NextResponse.json({ ok: false, erro: 'Semana da avaliação não confere.' }, { status: 400 });
    }
    if (String(rowExistente.colaborador_id) !== validado.colaboradorAlvo) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não confere com a avaliação.' }, { status: 400 });
    }
    if ((rowExistente as { edicao_utilizada?: boolean }).edicao_utilizada === true) {
      return NextResponse.json(
        { ok: false, erro: 'Você já usou a única edição permitida nesta avaliação.' },
        { status: 409 }
      );
    }

    if (validado.colaboradorAlvo === colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Não é possível autoavaliar' }, { status: 400 });
    }

    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, colaboradorId, unidadeId);
    if (!equipe.find((membro) => membro.id === validado.colaboradorAlvo)) {
      return NextResponse.json(
        { ok: false, erro: 'Colaborador não encontrado na sua equipe para esta semana.' },
        { status: 403 }
      );
    }

    const { error: updErr } = await updateAvaliacaoDiariaCompat(supabase, avaliacaoId, validado.row);
    if (updErr) {
      return NextResponse.json({ ok: false, erro: updErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true, media_dia: validado.media, edicao_utilizada: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
