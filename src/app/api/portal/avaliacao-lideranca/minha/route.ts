import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { gerarFeedbackLideranca } from '@/lib/feedback-lideranca';
import { normalizePortalRole } from '@/lib/roles';

type NotaRow = Record<string, unknown> & { semana_inicio: string };

function mesAtualRangeUTC(): { ini: string; fim: string; mesRef: string } {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const ini = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fim = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { ini, fim, mesRef: `${y}-${String(m).padStart(2, '0')}` };
}

/** Retorna visão da própria liderança para gerente/master/admin (somente o próprio avaliado). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

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

    const { ini, fim, mesRef } = mesAtualRangeUTC();
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
    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        mes_referencia: mesRef,
        nome: String((eu as { nome?: string }).nome ?? ''),
        total_avaliacoes: 0,
        medias: null,
        feedback: null,
        nota_privacidade:
          'Apenas você visualiza esta análise individual. Sócios e administrativo têm acesso consolidado no relatório geral.',
      });
    }

    const soma = rows.reduce(
      (acc, r) => ({
        exemplo: acc.exemplo + Number(r.n_exemplo ?? r.n_organizacao ?? 3),
        comunicacao: acc.comunicacao + Number(r.n_comunicacao ?? r.n_fala_escuta ?? 3),
        suporte: acc.suporte + Number(r.n_suporte ?? r.n_apoio ?? 3),
        justica: acc.justica + Number(r.n_justica ?? r.n_organizacao ?? 3),
        clima: acc.clima + Number(r.n_clima ?? r.n_ambiente ?? 3),
      }),
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
      nota_privacidade:
        'Apenas você visualiza esta análise individual. Sócios e administrativo têm acesso consolidado no relatório geral.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
