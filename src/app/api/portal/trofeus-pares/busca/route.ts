import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Busca colegas da mesma unidade por nome (para envio de troféu). */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending' || !unidadeId) {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ ok: true, colegas: [] }, { headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nome, cargo, setor')
      .eq('unidade_id', unidadeId)
      .eq('role', 'colaborador')
      .eq('onboarding_completo', true)
      .neq('id', colaboradorId)
      .ilike('nome', `%${q.replace(/%/g, '')}%`)
      .order('nome', { ascending: true })
      .limit(12);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
    }

    const colegas = (data ?? [])
      .filter((c) => normalizePortalRole((c as { role?: string }).role) === 'colaborador')
      .map((c) => ({
        id: String(c.id),
        nome: String(c.nome ?? ''),
        cargo: (c as { cargo?: string | null }).cargo ?? null,
        setor: (c as { setor?: string | null }).setor ?? null,
      }));

    return NextResponse.json({ ok: true, colegas }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
