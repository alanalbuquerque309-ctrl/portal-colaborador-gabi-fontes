import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarFeedbackLideranca } from '@/lib/feedback-lideranca';
import { normalizePortalRole } from '@/lib/roles';

type NotaRow = Record<string, unknown> & { semana_inicio: string };

function mesRangeFromParam(mes: string | null): { ini: string; fim: string; mesRef: string } | null {
  const ref = (mes ?? '').trim();
  const m = /^(\d{4})-(\d{2})$/.exec(ref);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const ini = `${y}-${String(mo).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const fim = `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${y}-${String(mo).padStart(2, '0')}` };
}

function mesAtualRangeUTC(): { ini: string; fim: string; mesRef: string } {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const ini = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fim = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${y}-${String(m).padStart(2, '0')}` };
}

function mediasDeLinha(r: NotaRow) {
  const exemplo = Number(r.n_exemplo ?? r.n_organizacao ?? 3);
  const comunicacao = Number(r.n_comunicacao ?? r.n_fala_escuta ?? 3);
  const suporte = Number(r.n_suporte ?? r.n_apoio ?? 3);
  const justica = Number(r.n_justica ?? r.n_organizacao ?? 3);
  const clima = Number(r.n_clima ?? r.n_ambiente ?? 3);
  const vals = [exemplo, comunicacao, suporte, justica, clima];
  const mediaGeral = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  return { exemplo, comunicacao, suporte, justica, clima, mediaGeral };
}

function formatarSemanaPt(iso: string): string {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!p) return iso;
  const d = new Date(Number(p[1]), Number(p[2]) - 1, Number(p[3]));
  const ini = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const fim = new Date(d);
  fim.setDate(fim.getDate() + 6);
  const fimStr = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${ini} a ${fimStr}`;
}

/** Retorna visão da própria liderança para gerente/master/admin (somente o próprio avaliado). */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mesParam = searchParams.get('mes');

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, role, nome')
      .eq('id', colaboradorId)
      .single();
    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    if (!['gerente', 'master', 'admin'].includes(role)) {
      return NextResponse.json(
        { ok: false, erro: 'Somente líderes podem acessar esta visão.' },
        { status: 403 }
      );
    }

    const { ini, fim, mesRef } = mesRangeFromParam(mesParam) ?? mesAtualRangeUTC();
    let data: NotaRow[] | null = null;
    let error: { message: string } | null = null;

    const primario = await supabase
      .from('avaliacoes_lideranca')
      .select('semana_inicio, n_exemplo, n_comunicacao, n_suporte, n_justica, n_clima')
      .eq('avaliado_id', colaboradorId)
      .gte('semana_inicio', ini)
      .lte('semana_inicio', fim)
      .order('semana_inicio', { ascending: false })
      .limit(100);
    data = primario.data as NotaRow[] | null;
    error = primario.error ? { message: primario.error.message } : null;

    if (error && /column .*n_exemplo.*does not exist/i.test(error.message)) {
      const retry = await supabase
        .from('avaliacoes_lideranca')
        .select('semana_inicio, n_fala_escuta, n_apoio, n_ambiente, n_organizacao')
        .eq('avaliado_id', colaboradorId)
        .gte('semana_inicio', ini)
        .lte('semana_inicio', fim)
        .order('semana_inicio', { ascending: false })
        .limit(100);
      data = retry.data as NotaRow[] | null;
      error = retry.error ? { message: retry.error.message } : null;
    }
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const rows = (data ?? []) as NotaRow[];
    const notaPrivacidade =
      'As avaliações são anônimas: você vê médias e totais, não quem respondeu. Sócios e administrativo têm visão consolidada no relatório geral.';

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        mes_referencia: mesRef,
        nome: String((eu as { nome?: string }).nome ?? ''),
        total_avaliacoes: 0,
        medias: null,
        feedback: null,
        historico_semanas: [],
        nota_privacidade: notaPrivacidade,
      });
    }

    const porSemana = new Map<string, NotaRow[]>();
    for (const r of rows) {
      const k = String(r.semana_inicio);
      const arr = porSemana.get(k) ?? [];
      arr.push(r);
      porSemana.set(k, arr);
    }

    const historico_semanas = Array.from(porSemana.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([semana_inicio, linhas]) => {
        const mediasLinhas = linhas.map(mediasDeLinha);
        const n = mediasLinhas.length;
        const medias = {
          exemplo: Math.round((mediasLinhas.reduce((a, x) => a + x.exemplo, 0) / n) * 100) / 100,
          comunicacao: Math.round((mediasLinhas.reduce((a, x) => a + x.comunicacao, 0) / n) * 100) / 100,
          suporte: Math.round((mediasLinhas.reduce((a, x) => a + x.suporte, 0) / n) * 100) / 100,
          justica: Math.round((mediasLinhas.reduce((a, x) => a + x.justica, 0) / n) * 100) / 100,
          clima: Math.round((mediasLinhas.reduce((a, x) => a + x.clima, 0) / n) * 100) / 100,
          mediaGeral:
            Math.round((mediasLinhas.reduce((a, x) => a + x.mediaGeral, 0) / n) * 100) / 100,
        };
        return {
          semana_inicio,
          semana_label: formatarSemanaPt(semana_inicio),
          respostas: n,
          medias,
        };
      });

    const soma = rows.reduce(
      (acc, r) => {
        const m = mediasDeLinha(r);
        return {
          exemplo: acc.exemplo + m.exemplo,
          comunicacao: acc.comunicacao + m.comunicacao,
          suporte: acc.suporte + m.suporte,
          justica: acc.justica + m.justica,
          clima: acc.clima + m.clima,
        };
      },
      { exemplo: 0, comunicacao: 0, suporte: 0, justica: 0, clima: 0 }
    );
    const tot = rows.length;
    const medias = {
      exemplo: Math.round((soma.exemplo / tot) * 100) / 100,
      comunicacao: Math.round((soma.comunicacao / tot) * 100) / 100,
      suporte: Math.round((soma.suporte / tot) * 100) / 100,
      justica: Math.round((soma.justica / tot) * 100) / 100,
      clima: Math.round((soma.clima / tot) * 100) / 100,
    };
    const feedback = gerarFeedbackLideranca(medias, `${colaboradorId}|${mesRef}`);

    return NextResponse.json({
      ok: true,
      mes_referencia: mesRef,
      nome: String((eu as { nome?: string }).nome ?? ''),
      total_avaliacoes: tot,
      medias,
      feedback,
      historico_semanas,
      nota_privacidade: notaPrivacidade,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
