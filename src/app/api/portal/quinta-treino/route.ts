import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole, podeParticiparGraosCafe } from '@/lib/roles';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { ehQuintaSaoPaulo } from '@/lib/semana-brasil';
import { resolverQuintaTreino, type QuintaTreinoPerfil } from '@/lib/graos/quinta-treino';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Treino da quinta conforme perfil: colaborador (Grãos) ou liderança (avaliação da equipe). */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const viewerId = cookieStore.get('portal_colaborador_id')?.value;
  if (!viewerId || viewerId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: viewer, error } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', viewerId)
      .maybeSingle();

    if (error || !viewer) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = normalizePortalRole((viewer as { role?: string }).role);
    const ehLider = await podeUsarAvaliacaoEquipeSemanal(supabase, viewerId, role);
    const ehColaboradorOperacao = podeParticiparGraosCafe(role);

    if (!ehLider && !ehColaboradorOperacao) {
      return NextResponse.json(
        { ok: false, erro: 'Treino da quinta não disponível para este perfil.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const perfil: QuintaTreinoPerfil = ehLider && !ehColaboradorOperacao ? 'lider' : 'colaborador';
    const origin = new URL(req.url).origin;
    const quintaTreino = resolverQuintaTreino(origin, perfil);

    return NextResponse.json(
      {
        ok: true,
        eh_quinta: ehQuintaSaoPaulo(),
        perfil_treino: perfil,
        quinta_treino: quintaTreino,
        pode_concluir_graos: perfil === 'colaborador' && ehColaboradorOperacao,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
