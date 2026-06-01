import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { listarEscalasPortalColaborador } from '@/lib/escala-portal';

/** Escala do colaborador: tabela `escalas` + geração por `tipo_escala` no cadastro. */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dias = parseInt(searchParams.get('dias') ?? '45', 10);

  try {
    const supabase = createAdminClient();
    const { escalas, periodo, meta } = await listarEscalasPortalColaborador(supabase, colaboradorId, {
      dias,
    });

    return NextResponse.json({
      ok: true,
      escalas: escalas.map(({ id, data, hora_entrada, hora_saida, observacao }) => ({
        id,
        data,
        hora_entrada,
        hora_saida,
        observacao,
      })),
      periodo,
      meta: {
        ...meta,
        aviso_12x36:
          meta.tipo_escala === '12x36' && escalas.length === 0
            ? 'Escala 12x36 ainda não foi lançada dia a dia. Fale com o RH.'
            : null,
        aviso_vazio:
          escalas.length === 0 && !meta.tipo_escala
            ? 'Nenhuma escala no período. Peça ao RH para cadastrar ou definir seu regime (5x2 / 6x1).'
            : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
