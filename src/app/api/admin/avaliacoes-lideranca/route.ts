import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { listarAvaliacoesLiderancaRelatorio } from '@/lib/avaliacoes-lideranca-relatorio';

/**
 * Feedback sobre liderança — painel admin (visão total, autor visível).
 */
export async function GET(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() || null;
  const inicio = searchParams.get('inicio')?.trim() || null;
  const fim = searchParams.get('fim')?.trim() || null;
  const limite = Number(searchParams.get('limite')) || 3000;

  try {
    const supabase = createAdminClient();
    const { itens, nota, erro } = await listarAvaliacoesLiderancaRelatorio(supabase, {
      viewerColaboradorId: 'admin-panel',
      viewerRole: 'admin',
      unidadeSlug,
      inicio,
      fim,
      limite,
    });

    if (erro) {
      const status = erro === 'Unidade não encontrada' ? 400 : 500;
      return NextResponse.json({ ok: false, erro }, { status });
    }

    return NextResponse.json({
      ok: true,
      nota:
        nota ||
        'Todas as notas e justificativas sobre gerência/administrativo. Autor de cada avaliação visível.',
      itens,
      total: itens.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
