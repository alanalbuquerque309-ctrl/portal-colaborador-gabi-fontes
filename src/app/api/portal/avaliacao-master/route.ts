import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePortalGerenteSession } from '@/lib/portal-gerente-session';
import {
  calcularMediaDia,
  type AssiduidadeTipo,
  type NotasCriterios,
} from '@/lib/avaliacao-diaria';
import { listarEquipeParaAvaliacaoSemanal } from '@/lib/colaborador-lideres';
import {
  insertAvaliacaoDiariaCompat,
  selectAvaliacoesDiariasPorColaboradores,
} from '@/lib/avaliacoes-justificativa-compat';
import { inicioSemanaSegundaFeiraLocal } from '@/lib/semana-referencia';

function isDateIso(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function sanitizeJustificativa(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** Equipe do gerente + avaliações já salvas na semana (segunda de `data`); leitura após envio. */
export async function GET(req: Request) {
  const auth = await requirePortalGerenteSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dataRefRaw = searchParams.get('data')?.trim() ?? '';
  if (!isDateIso(dataRefRaw)) {
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
        ids
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

type BodyPost = {
  data_referencia?: string;
  colaborador_id?: string;
  assiduidade?: string;
  nota_vestimenta?: number | null;
  nota_pontualidade?: number | null;
  nota_trabalho_equipe?: number | null;
  nota_desempenho_tarefas?: number | null;
  justificativa_nota_baixa?: string;
};

function isAssiduidade(s: string): s is AssiduidadeTipo {
  return (
    s === 'presente' ||
    s === 'folga' ||
    s === 'outra_escala' ||
    s === 'falta_justificada' ||
    s === 'falta_injustificada'
  );
}

function assiduidadeParaBanco(s: AssiduidadeTipo): 'presente' | 'falta_justificada' | 'falta_injustificada' {
  if (s === 'folga' || s === 'outra_escala') return 'falta_justificada';
  return s;
}

/** Primeiro envio da avaliação; depois bloqueado (sem edição). */
export async function POST(req: Request) {
  const auth = await requirePortalGerenteSession();
  if (!auth.ok) return auth.response;

  let body: BodyPost;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const dataRefRaw = String(body.data_referencia ?? '').trim();
  const colaboradorAlvo = String(body.colaborador_id ?? '').trim();
  const assidRaw = String(body.assiduidade ?? '').trim();
  const justificativaNotaBaixa = sanitizeJustificativa(body.justificativa_nota_baixa);

  if (!isDateIso(dataRefRaw) || !colaboradorAlvo || !isAssiduidade(assidRaw)) {
    return NextResponse.json({ ok: false, erro: 'Dados obrigatórios inválidos' }, { status: 400 });
  }
  const dataRef = inicioSemanaSegundaFeiraLocal(dataRefRaw);

  const notasEntrada: NotasCriterios = {
    vestimenta: body.nota_vestimenta ?? null,
    pontualidade: body.nota_pontualidade ?? null,
    trabalhoEquipe: body.nota_trabalho_equipe ?? null,
    desempenhoTarefas: body.nota_desempenho_tarefas ?? null,
  };

  const { media, notasPersistidas } = calcularMediaDia(assidRaw, notasEntrada);
  const temNotaBaixa =
    assidRaw === 'falta_injustificada' ||
    Object.values(notasPersistidas).some((nota) => typeof nota === 'number' && nota <= 3);

  if (temNotaBaixa && justificativaNotaBaixa.length < 10) {
    return NextResponse.json(
      { ok: false, erro: 'Explique em poucas palavras o motivo da nota 3 ou menor.' },
      { status: 400 }
    );
  }
  if (justificativaNotaBaixa.length > 500) {
    return NextResponse.json(
      { ok: false, erro: 'Justificativa muito longa (máx. 500 caracteres).' },
      { status: 400 }
    );
  }

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

    const equipe = await listarEquipeParaAvaliacaoSemanal(supabase, colaboradorId, unidadeId);
    const sub = equipe.find((membro) => membro.id === colaboradorAlvo);
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
      .eq('colaborador_id', colaboradorAlvo)
      .eq('data_referencia', dataRef)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          erro:
            'Este colaborador já recebeu avaliação nesta semana. Para correção, contacte o administrativo/RH.',
        },
        { status: 409 }
      );
    }

    const row = {
      colaborador_id: colaboradorAlvo,
      avaliador_id: colaboradorId,
      data_referencia: dataRef,
      assiduidade: assiduidadeParaBanco(assidRaw),
      nota_vestimenta: notasPersistidas.vestimenta,
      nota_pontualidade: notasPersistidas.pontualidade,
      nota_trabalho_equipe: notasPersistidas.trabalhoEquipe,
      nota_desempenho_tarefas: notasPersistidas.desempenhoTarefas,
      media_dia: media,
      justificativa_nota_baixa: temNotaBaixa ? justificativaNotaBaixa : null,
    };

    const { error: insErr } = await insertAvaliacaoDiariaCompat(supabase, row);

    if (insErr) {
      return NextResponse.json({ ok: false, erro: insErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true, media_dia: media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
