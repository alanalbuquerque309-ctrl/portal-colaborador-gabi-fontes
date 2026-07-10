import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { montarPainelPessoalColaborador } from '@/lib/portal-painel-pessoal';
import { montarPainelLiderInspirador } from '@/lib/lider-inspirador';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { socioIsentoObrigacoesOperacionaisPortal } from '@/lib/socios-negocio';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Painéis pesados da home (rankings / ILI) — segundo fetch após o shell. */
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
      .select('id, nome, role')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = normalizePortalRole((col as { role?: string }).role);
    const nomeCol = String((col as { nome?: string }).nome ?? '');
    const isentoOperacional = socioIsentoObrigacoesOperacionaisPortal({ role, nome: nomeCol });

    let painel = null;
    let painel_lider = null;
    if (role === 'colaborador') {
      painel = await montarPainelPessoalColaborador(supabase, colaboradorId);
    } else if (!isentoOperacional) {
      const podeEquipe = await podeUsarAvaliacaoEquipeSemanal(supabase, colaboradorId, role);
      if (podeEquipe) {
        painel_lider = await montarPainelLiderInspirador(supabase, colaboradorId, nomeCol, role);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        is_lider: painel_lider != null,
        painel,
        painel_lider,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
