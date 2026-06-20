import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { montarPendenciasPortalHome } from '@/lib/portal-pendencias-home';
import { derivarSituacaoHome } from '@/lib/portal-situacao-home';
import { montarPainelPessoalColaborador } from '@/lib/portal-painel-pessoal';
import type { PortalHomeResumo } from '@/lib/portal-home-types';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: col, error } = await supabase
      .from('colaboradores')
      .select('id, nome, role, unidade_id, setor, unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = normalizePortalRole((col as { role?: string }).role);
    const unidadeEmbed = (col as { unidades?: { slug?: string } | { slug?: string }[] | null }).unidades;
    const unidadeSlug = Array.isArray(unidadeEmbed) ? unidadeEmbed[0]?.slug : unidadeEmbed?.slug;

    const tarefas = await montarPendenciasPortalHome(supabase, {
      colaboradorId,
      unidadeId: String((col as { unidade_id: string }).unidade_id),
      role,
      nome: String((col as { nome?: string }).nome ?? ''),
      setor: (col as { setor?: string | null }).setor ?? null,
      unidadeSlug: unidadeSlug ?? null,
    });

    const situacao = derivarSituacaoHome(tarefas);

    let painel = null;
    if (role === 'colaborador') {
      painel = await montarPainelPessoalColaborador(supabase, colaboradorId);
    }

    const body: PortalHomeResumo = {
      ok: true,
      role,
      is_colaborador: role === 'colaborador',
      situacao,
      tarefas,
      painel,
    };

    return NextResponse.json(body, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
