import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { listarAvaliacoesLiderancaRelatorio } from '@/lib/avaliacoes-lideranca-relatorio';
import { podeVerRelatoriosAvaliacoesCompletos } from '@/lib/avaliacoes-relatorio-access';
import { normalizePortalRole } from '@/lib/roles';

/**
 * Relatório de feedback dos colaboradores sobre a liderança.
 * Acesso: sócio, admin, master, gerente (gerente só na própria unidade).
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() || null;
  const inicio = searchParams.get('inicio')?.trim() || null;
  const fim = searchParams.get('fim')?.trim() || null;
  const limite = Number(searchParams.get('limite')) || 2000;

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    if (!podeVerRelatoriosAvaliacoesCompletos(role)) {
      return NextResponse.json(
        {
          ok: false,
          erro: 'Sem permissão. Sócio, administrativo, master ou gerente podem consultar este relatório.',
        },
        { status: 403 }
      );
    }

    const { itens, nota, erro } = await listarAvaliacoesLiderancaRelatorio(supabase, {
      viewerColaboradorId: colaboradorId,
      viewerRole: role,
      unidadeSlug,
      inicio,
      fim,
      limite,
    });

    if (erro) {
      const status = erro === 'Unidade não encontrada' ? 400 : 500;
      return NextResponse.json({ ok: false, erro }, { status });
    }

    return NextResponse.json({ ok: true, nota, itens, total: itens.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
