import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalMasterSession } from '@/lib/portal-master-session';
import {
  calcularMediaDia,
  type AssiduidadeTipo,
  type NotasCriterios,
} from '@/lib/avaliacao-diaria';

function isDateIso(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Equipe do Master + avaliações já salvas na data. */
export async function GET(req: Request) {
  const auth = await requirePortalMasterSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dataRef = searchParams.get('data')?.trim() ?? '';
  if (!isDateIso(dataRef)) {
    return NextResponse.json({ ok: false, erro: 'Parâmetro data inválido (use YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { colaboradorId, unidadeId } = auth.ctx;

    const { data: equipe, error: errEquipe } = await supabase
      .from('colaboradores')
      .select('id, nome, cargo, setor')
      .eq('lider_id', colaboradorId)
      .eq('unidade_id', unidadeId)
      .neq('id', colaboradorId)
      .order('nome');

    if (errEquipe) {
      return NextResponse.json({ ok: false, erro: errEquipe.message }, { status: 500 });
    }

    const ids = (equipe ?? []).map((c) => c.id);
    let avaliacoesPorColab: Record<string, Record<string, unknown>> = {};

    if (ids.length > 0) {
      const { data: avalRows, error: errAval } = await supabase
        .from('avaliacoes_diarias')
        .select(
          'colaborador_id, assiduidade, nota_vestimenta, nota_pontualidade, nota_trabalho_equipe, nota_desempenho_tarefas, media_dia'
        )
        .eq('avaliador_id', colaboradorId)
        .eq('data_referencia', dataRef)
        .in('colaborador_id', ids);

      if (errAval) {
        return NextResponse.json({ ok: false, erro: errAval.message }, { status: 500 });
      }
      avaliacoesPorColab = Object.fromEntries((avalRows ?? []).map((r) => [r.colaborador_id as string, r]));
    }

    return NextResponse.json({
      ok: true,
      data_referencia: dataRef,
      equipe: (equipe ?? []).map((c) => ({
        ...c,
        avaliacao: avaliacoesPorColab[c.id] ?? null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

type BodyPost = {
  data_referencia?: string;
  colaborador_id?: string;
  assiduidade?: string;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
};

function isAssiduidade(s: string): s is AssiduidadeTipo {
  return s === 'presente' || s === 'falta_justificada' || s === 'falta_injustificada';
}

/** Salva ou atualiza uma avaliação diária. */
export async function POST(req: Request) {
  const auth = await requirePortalMasterSession();
  if (!auth.ok) return auth.response;

  let body: BodyPost;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const dataRef = String(body.data_referencia ?? '').trim();
  const colaboradorAlvo = String(body.colaborador_id ?? '').trim();
  const assidRaw = String(body.assiduidade ?? '').trim();

  if (!isDateIso(dataRef) || !colaboradorAlvo || !isAssiduidade(assidRaw)) {
    return NextResponse.json({ ok: false, erro: 'Dados obrigatórios inválidos' }, { status: 400 });
  }

  const notasEntrada: NotasCriterios = {
    vestimenta: body.nota_vestimenta ?? null,
    pontualidade: body.nota_pontualidade ?? null,
    trabalhoEquipe: body.nota_trabalho_equipe ?? null,
    desempenhoTarefas: body.nota_desempenho_tarefas ?? null,
  };

  const { media, notasPersistidas } = calcularMediaDia(assidRaw, notasEntrada);

  if (assidRaw === 'presente') {
    const { vestimenta, pontualidade, trabalhoEquipe, desempenhoTarefas } = notasPersistidas;
    if (
      vestimenta == null ||
      pontualidade == null ||
      trabalhoEquipe == null ||
      desempenhoTarefas == null ||
      vestimenta < 1 ||
      vestimenta > 5 ||
      pontualidade < 1 ||
      pontualidade > 5 ||
      trabalhoEquipe < 1 ||
      trabalhoEquipe > 5 ||
      desempenhoTarefas < 1 ||
      desempenhoTarefas > 5
    ) {
      return NextResponse.json(
        { ok: false, erro: 'Com presença, informe de 1 a 5 estrelas nos quatro critérios.' },
        { status: 400 }
      );
    }
  }

  try {
    const supabase = createAdminClient();
    const { colaboradorId, unidadeId } = auth.ctx;

    if (colaboradorAlvo === colaboradorId) {
      return NextResponse.json({ ok: false, erro: 'Não é possível autoavaliar' }, { status: 400 });
    }

    const { data: sub, error: errSub } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('id', colaboradorAlvo)
      .eq('lider_id', colaboradorId)
      .eq('unidade_id', unidadeId)
      .maybeSingle();

    if (errSub || !sub) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não pertence à sua equipe' }, { status: 403 });
    }

    const row = {
      colaborador_id: colaboradorAlvo,
      avaliador_id: colaboradorId,
      data_referencia: dataRef,
      assiduidade: assidRaw,
      nota_vestimenta: notasPersistidas.vestimenta,
      nota_pontualidade: notasPersistidas.pontualidade,
      nota_trabalho_equipe: notasPersistidas.trabalhoEquipe,
      nota_desempenho_tarefas: notasPersistidas.desempenhoTarefas,
      media_dia: media,
    };

    const { error: upErr } = await supabase.from('avaliacoes_diarias').upsert(row, {
      onConflict: 'colaborador_id,avaliador_id,data_referencia',
    });

    if (upErr) {
      return NextResponse.json({ ok: false, erro: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, media_dia: media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
