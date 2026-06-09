import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminFullApi } from '@/lib/admin-auth';
import { listarAvaliacoesLiderancaRelatorio } from '@/lib/avaliacoes-lideranca-relatorio';

/**
 * Feedback sobre liderança — painel admin (visão total, autor visível).
 */
export async function GET(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() || null;
  const inicio = searchParams.get('inicio')?.trim() || null;
  const fim = searchParams.get('fim')?.trim() || null;
  const limite = Number(searchParams.get('limite')) || 3000;

  try {
    const supabase = createAdminClient();
    const cookieStore = await cookies();
    const portalColaboradorId = cookieStore.get('portal_colaborador_id')?.value ?? '';
    const viewerRole = auth.ctx.kind === 'portal' ? auth.ctx.role : 'admin';
    const viewerColaboradorId =
      auth.ctx.kind === 'portal' && portalColaboradorId && portalColaboradorId !== 'pending'
        ? portalColaboradorId
        : 'admin-panel';

    let viewerNome: string | null = null;
    let viewerCpf: string | null = null;
    const cookieRole = cookieStore.get('portal_role')?.value ?? null;
    if (viewerColaboradorId !== 'admin-panel') {
      const { data: eu } = await supabase
        .from('colaboradores')
        .select('nome, cpf')
        .eq('id', viewerColaboradorId)
        .maybeSingle();
      viewerNome = eu?.nome ? String(eu.nome) : null;
      viewerCpf = (eu as { cpf?: string | null })?.cpf
        ? String((eu as { cpf?: string | null }).cpf)
        : null;
    }

    const { itens, nota, auditoria_socio, viewer_role, erro } = await listarAvaliacoesLiderancaRelatorio(
      supabase,
      {
        viewerColaboradorId,
        viewerRole,
        viewerNome,
        viewerCpf,
        viewerRoleCookie: cookieRole,
        unidadeSlug,
        inicio,
        fim,
        limite,
      }
    );

    if (erro) {
      const status = erro === 'Unidade não encontrada' ? 400 : 500;
      return NextResponse.json({ ok: false, erro }, { status });
    }

    return NextResponse.json({
      ok: true,
      nota:
        nota ||
        'Todas as notas e justificativas sobre gerência/administrativo. Avaliador anônimo nesta visão.',
      auditoria_socio,
      viewer_role,
      itens,
      total: itens.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
