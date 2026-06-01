import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';

function podeExecutar(ctx: Awaited<ReturnType<typeof getAdminViewerContext>>): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerBonificacaoInterna(ctx.role);
}

/** Apaga todas as avaliações semanais e troféus entre pares (reset operacional). */
export async function POST(req: Request) {
  const ctx = await getAdminViewerContext();
  if (!podeExecutar(ctx)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito (sócio/admin)' }, { status: 403 });
  }

  let body: { confirmar?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.confirmar !== 'ZERAR') {
    return NextResponse.json(
      {
        ok: false,
        erro: 'Envie JSON { "confirmar": "ZERAR" } para confirmar a exclusão de todos os registros.',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    const { count: countTrof, error: errTrof } = await supabase
      .from('trofeus_entre_pares')
      .delete({ count: 'exact' })
      .gte('semana_inicio', '1900-01-01');

    if (errTrof) {
      return NextResponse.json({ ok: false, erro: errTrof.message }, { status: 500 });
    }

    const { count: countAval, error: errAval } = await supabase
      .from('avaliacoes_diarias')
      .delete({ count: 'exact' })
      .gte('data_referencia', '1900-01-01');

    if (errAval) {
      return NextResponse.json({ ok: false, erro: errAval.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      msg: 'Avaliações e troféus entre pares removidos.',
      removidos: {
        avaliacoes_diarias: countAval ?? 0,
        trofeus_entre_pares: countTrof ?? 0,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
