import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { contarTreinamentosPendentesNav } from '@/lib/treinamento-pendencias-nav';

export const dynamic = 'force-dynamic';

/** Resposta cacheável no browser por pouco tempo; confirmação dispara refresh imediato. */
const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
} as const;

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, nome, role, setor, unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const unidadeEmbed = (col as { unidades?: { slug?: string } | { slug?: string }[] | null }).unidades;
    const unidadeSlug = Array.isArray(unidadeEmbed) ? unidadeEmbed[0]?.slug : unidadeEmbed?.slug;
    const role = normalizePortalRole((col as { role?: string }).role);

    const resumo = await contarTreinamentosPendentesNav(supabase, {
      colaboradorId,
      role,
      nome: (col as { nome?: string | null }).nome,
      setor: (col as { setor?: string | null }).setor ?? null,
      unidadeSlug: unidadeSlug ?? null,
    });

    return NextResponse.json({ ok: true, ...resumo }, { headers: CACHE_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
