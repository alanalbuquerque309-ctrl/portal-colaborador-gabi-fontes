import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { montarFechamentoBonificacao } from '@/lib/bonificacao-fechamento';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import { getAdminViewerContext } from '@/lib/admin-auth';

function podeAcessarBonificacaoAdmin(ctx: Awaited<ReturnType<typeof getAdminViewerContext>>): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerBonificacaoInterna(ctx.role);
}

/** Índice interno de bonificação (só sócio/admin ou sessão admin por senha). Não expor ao colaborador. */
export async function GET(req: Request) {
  const ctx = await getAdminViewerContext();
  if (!podeAcessarBonificacaoAdmin(ctx)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes')?.trim() ?? '';
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() ?? '';

  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(mes)) {
    return NextResponse.json(
      { ok: false, erro: 'Parâmetro mes inválido (use YYYY-MM ou YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    let unidadeId: string | null = null;
    if (unidadeSlug) {
      const { data: u } = await supabase.from('unidades').select('id').eq('slug', unidadeSlug).maybeSingle();
      if (!u?.id) {
        return NextResponse.json({ ok: false, erro: 'Unidade não encontrada' }, { status: 404 });
      }
      unidadeId = String(u.id);
    }

    const fechamento = await montarFechamentoBonificacao(supabase, {
      mesReferencia: mes,
      unidadeId,
    });

    return NextResponse.json({
      ok: true,
      periodo: { inicio: fechamento.inicio, fim: fechamento.fim },
      linhas: fechamento.linhas,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
