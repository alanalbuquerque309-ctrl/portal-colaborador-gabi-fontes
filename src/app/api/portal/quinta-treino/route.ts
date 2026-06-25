import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole, podeParticiparGraosCafe, podeVerTodosTreinosQuinta } from '@/lib/roles';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { ehQuintaSaoPaulo } from '@/lib/semana-brasil';
import { resolverQuintaTreino, resolverParTreinosQuinta, type QuintaTreinoPerfil } from '@/lib/graos/quinta-treino';
import { liderConcluiuTreinoAtual } from '@/lib/treino-lider-acompanhamento';

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
    const verTodos = podeVerTodosTreinosQuinta(role);
    const origin = new URL(req.url).origin;
    const ehQuinta = ehQuintaSaoPaulo();

    if (verTodos) {
      const par = resolverParTreinosQuinta(origin);
      return NextResponse.json(
        {
          ok: true,
          eh_quinta: ehQuinta,
          ver_todos: true,
          treinos_quinta: par,
          quinta_treino: par.colaborador,
          perfil_treino: 'colaborador' as const,
          pode_concluir_graos: false,
        },
        { headers: NO_STORE }
      );
    }

    if (!ehLider && !ehColaboradorOperacao) {
      return NextResponse.json(
        { ok: false, erro: 'Treino da quinta não disponível para este perfil.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const perfil: QuintaTreinoPerfil = ehLider && !ehColaboradorOperacao ? 'lider' : 'colaborador';
    const treinoLiderConcluido =
      perfil === 'lider' ? await liderConcluiuTreinoAtual(supabase, viewerId) : undefined;

    if (ehLider && !ehColaboradorOperacao) {
      const par = resolverParTreinosQuinta(origin);
      return NextResponse.json(
        {
          ok: true,
          eh_quinta: ehQuinta,
          perfil_treino: perfil,
          quinta_treino: par.lider,
          treinos_quinta: par,
          treino_lider_concluido: treinoLiderConcluido,
          pode_concluir_graos: false,
        },
        { headers: NO_STORE }
      );
    }

    const quintaTreino = resolverQuintaTreino(origin, perfil);

    return NextResponse.json(
      {
        ok: true,
        eh_quinta: ehQuinta,
        perfil_treino: perfil,
        quinta_treino: quintaTreino,
        treino_lider_concluido: treinoLiderConcluido,
        pode_concluir_graos: perfil === 'colaborador' && ehColaboradorOperacao,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
