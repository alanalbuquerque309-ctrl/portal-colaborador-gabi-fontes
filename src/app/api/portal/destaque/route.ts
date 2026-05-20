import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularDestaquesMural } from '@/lib/destaque-avaliacoes';
import { segundaSemanaSaoPaulo } from '@/lib/semana-brasil';

/** Destaque automático (semana + mês) a partir das avaliações da equipe. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const semanaInicio = segundaSemanaSaoPaulo();
    const resultado = await calcularDestaquesMural(supabase, semanaInicio);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
