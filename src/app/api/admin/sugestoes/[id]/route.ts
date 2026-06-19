import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  canViewReclamacoesAdmin,
  getAdminViewerContext,
  requireAdminFullApi,
} from '@/lib/admin-auth';
import {
  aplicarDestaqueSugestaoGraos,
  podeDestacarSugestaoGraos,
  semanaInicioDeCreatedAt,
} from '@/lib/graos/sugestao-destaque';

/** Marca sugestão/reclamação como vista ou destaca sugestão (+7 Grãos). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;
  const ctx = auth.ctx;
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  let body: { visualizado?: boolean; destaque_graos?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const selectsRow = [
      'id, tipo, colaborador_id, created_at, graos_destaque_em',
      'id, tipo, colaborador_id, created_at',
    ];

    let row: Record<string, unknown> | null = null;
    let errRowMsg = '';

    for (const sel of selectsRow) {
      const { data, error: errRow } = await supabase
        .from('sugestoes_reclamacoes')
        .select(sel)
        .eq('id', id)
        .single();

      if (!errRow && data) {
        row = data as unknown as Record<string, unknown>;
        break;
      }
      errRowMsg = errRow?.message ?? 'Registro não encontrado';
      if (!errRow || !/graos_destaque|does not exist|schema cache/i.test(errRow.message)) {
        break;
      }
    }

    if (!row) {
      return NextResponse.json({ ok: false, erro: errRowMsg || 'Registro não encontrado' }, { status: 404 });
    }

    const tipo = String((row as { tipo?: string }).tipo ?? '');
    if (tipo === 'reclamacao' && !canViewReclamacoesAdmin(ctx)) {
      return NextResponse.json({ ok: false, erro: 'Sem permissão para reclamações' }, { status: 403 });
    }

    if (body.destaque_graos === true) {
      if (tipo !== 'sugestao') {
        return NextResponse.json(
          { ok: false, erro: 'Destaque de Grãos vale só para sugestões.' },
          { status: 400 }
        );
      }
      if (!podeDestacarSugestaoGraos(ctx)) {
        return NextResponse.json(
          { ok: false, erro: 'Apenas sócios e administrador podem destacar sugestões.' },
          { status: 403 }
        );
      }

      const colaboradorId = String((row as { colaborador_id?: string | null }).colaborador_id ?? '');
      if (!colaboradorId) {
        return NextResponse.json(
          { ok: false, erro: 'Sugestão sem autor identificado — não é possível creditar Grãos.' },
          { status: 400 }
        );
      }

      if ((row as { graos_destaque_em?: string | null }).graos_destaque_em) {
        return NextResponse.json({ ok: true, ja_destacada: true });
      }

      const cookieStore = await cookies();
      const destacadoPorId =
        ctx.kind === 'portal' ? cookieStore.get('portal_colaborador_id')?.value ?? null : null;

      const createdAt = String((row as { created_at?: string }).created_at ?? '');
      const result = await aplicarDestaqueSugestaoGraos(supabase, {
        sugestaoId: id,
        colaboradorId,
        semanaInicio: semanaInicioDeCreatedAt(createdAt),
        destacadoPorId,
      });

      if (!result.ok) {
        return NextResponse.json({ ok: false, erro: result.erro }, { status: 500 });
      }

      return NextResponse.json({ ok: true, destaque_graos: true });
    }

    if (body.visualizado !== true) {
      return NextResponse.json({ ok: false, erro: 'Use visualizado: true ou destaque_graos: true' }, { status: 400 });
    }

    const { error } = await supabase
      .from('sugestoes_reclamacoes')
      .update({ visualizado_em: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
