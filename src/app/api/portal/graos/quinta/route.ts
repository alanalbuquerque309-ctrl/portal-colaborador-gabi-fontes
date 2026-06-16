import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole, podeParticiparGraosCafe } from '@/lib/roles';
import { ehQuintaSaoPaulo, hojeIsoSaoPaulo, segundaSemanaSaoPaulo } from '@/lib/semana-brasil';
import { creditarMissaoGraos, refKeyGraos } from '@/lib/graos/movimentos';
import { GRAOS_MISSAO } from '@/lib/graos/constants';
import { processarElegibilidadeSemanaGraos } from '@/lib/graos/movimentos';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Concluir treino da quinta (+5 Grãos). */
export async function POST() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  if (!ehQuintaSaoPaulo()) {
    return NextResponse.json(
      { ok: false, erro: 'Quinta do café disponível apenas na quinta-feira (horário de São Paulo).' },
      { status: 403, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: colab } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (!colab || !podeParticiparGraosCafe((colab as { role?: string }).role)) {
      return NextResponse.json({ ok: false, erro: 'Apenas colaboradores.' }, { status: 403, headers: NO_STORE });
    }

    const dataQuinta = hojeIsoSaoPaulo();
    const semanaInicio = segundaSemanaSaoPaulo();

    const { error: errIns } = await supabase.from('graos_quinta_conclusoes').upsert(
      { colaborador_id: colaboradorId, data_quinta: dataQuinta },
      { onConflict: 'colaborador_id,data_quinta' }
    );

    if (errIns) {
      return NextResponse.json({ ok: false, erro: errIns.message }, { status: 500, headers: NO_STORE });
    }

    await creditarMissaoGraos(supabase, {
      colaboradorId,
      semanaInicio,
      missao: 'quinta',
      graos: GRAOS_MISSAO.quinta,
      refKey: refKeyGraos(colaboradorId, 'quinta', semanaInicio, dataQuinta),
      descricao: 'Quinta do café',
    });

    await processarElegibilidadeSemanaGraos(supabase, colaboradorId, semanaInicio);

    return NextResponse.json({ ok: true, graos: GRAOS_MISSAO.quinta }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
