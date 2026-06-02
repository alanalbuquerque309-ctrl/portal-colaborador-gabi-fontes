import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularDestaquesMural } from '@/lib/destaque-avaliacoes';
import { calcularRankingsMuralDoColaborador } from '@/lib/mural-ranking-unidade';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';

export const dynamic = 'force-dynamic';

/** Destaque automático (semana + mês) e top 3 da unidade (mês anterior fixo + mês atual). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const semanaInicio = segundaSemanaSaoPaulo();

    const { data: viewer, error: errViewer } = await supabase
      .from('colaboradores')
      .select('unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errViewer) {
      return NextResponse.json({ ok: false, erro: errViewer.message }, { status: 500 });
    }

    const unidadeEmbed = viewer?.unidades as { slug?: string } | { slug?: string }[] | null | undefined;
    const unidadeSlug = Array.isArray(unidadeEmbed)
      ? unidadeEmbed[0]?.slug
      : unidadeEmbed?.slug;

    const [resultado, rankingUnidade] = await Promise.all([
      calcularDestaquesMural(supabase, semanaInicio),
      calcularRankingsMuralDoColaborador(supabase, unidadeSlug ? String(unidadeSlug) : null),
    ]);

    return NextResponse.json(
      {
        ok: true,
        ...resultado,
        ranking_unidade: rankingUnidade,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
