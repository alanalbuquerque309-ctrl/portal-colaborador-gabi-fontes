import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { montarResumoDesdeVisita } from '@/lib/portal-resumo-desde-visita';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const role = cookieStore.get('portal_role')?.value ?? '';

  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  const { searchParams } = new URL(req.url);
  const desdeParam = searchParams.get('desde');

  try {
    const supabase = createAdminClient();
    const { data: colab, error: errColab } = await supabase
      .from('colaboradores')
      .select('setor, unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errColab || !colab) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const unidadeRaw = (colab as { unidades?: unknown }).unidades;
    const unidadeObj = Array.isArray(unidadeRaw) ? unidadeRaw[0] : unidadeRaw;
    const unidadeSlug =
      unidadeObj && typeof unidadeObj === 'object' && 'slug' in unidadeObj
        ? String((unidadeObj as { slug?: string }).slug ?? '')
        : '';

    const resultado = await montarResumoDesdeVisita(supabase, {
      colaboradorId,
      role,
      unidadeSlug,
      setor: (colab as { setor?: string | null }).setor ?? null,
      desdeParam,
    });

    return NextResponse.json(resultado, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
