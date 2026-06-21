import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { grupoCafeConectaPorUnidadeSlug } from '@/lib/cafe-conecta/config';
import { buscarSorteioPublicadoPortal } from '@/lib/cafe-conecta/service';
import { contagemFeedbackSorteio, minhaReacaoSorteio } from '@/lib/cafe-conecta/historico';

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
      .select('unidades(slug)')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !col) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const u = Array.isArray(col.unidades) ? col.unidades[0] : col.unidades;
    const slug = u?.slug ? String(u.slug) : '';
    const grupo = grupoCafeConectaPorUnidadeSlug(slug);
    if (!grupo) {
      return NextResponse.json({ ok: true, sorteio: null }, { headers: NO_STORE });
    }

    const sorteio = await buscarSorteioPublicadoPortal(supabase, grupo.slug);
    if (!sorteio) {
      return NextResponse.json({ ok: true, sorteio: null }, { headers: NO_STORE });
    }

    const [minhaReacao, feedbackTotal] = await Promise.all([
      minhaReacaoSorteio(supabase, sorteio.id, colaboradorId),
      contagemFeedbackSorteio(supabase, sorteio.id),
    ]);

    return NextResponse.json(
      {
        ok: true,
        sorteio: {
          id: sorteio.id,
          data_referencia: sorteio.data_referencia,
          participantes: sorteio.participantes ?? [],
          minha_reacao: minhaReacao,
          feedback_total: feedbackTotal,
        },
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    if (/cafe_conecta/i.test(msg)) {
      return NextResponse.json({ ok: true, sorteio: null }, { headers: NO_STORE });
    }
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
