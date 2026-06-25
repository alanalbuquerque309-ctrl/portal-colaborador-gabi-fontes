import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { podeUsarAvaliacaoEquipeSemanal } from '@/lib/portal-gerente-session';
import { registrarConclusaoTreinoLider } from '@/lib/treino-lider-acompanhamento';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Marca treino de liderança como assistido (vídeo vigente). */
export async function POST() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();
    const { data: colab, error: errColab } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (errColab || !colab) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = normalizePortalRole((colab as { role?: string }).role);
    const podeEquipe = await podeUsarAvaliacaoEquipeSemanal(supabase, colaboradorId, role);
    if (!podeEquipe) {
      return NextResponse.json(
        { ok: false, erro: 'Treino de liderança é para quem avalia a equipe.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const result = await registrarConclusaoTreinoLider(supabase, colaboradorId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, erro: result.erro }, { status: 500, headers: NO_STORE });
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
