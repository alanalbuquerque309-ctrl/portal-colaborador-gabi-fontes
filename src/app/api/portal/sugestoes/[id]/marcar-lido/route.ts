import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { elogioVisivelNoPrazoRede } from '@/lib/elogios-vigencia';

/** Marca elogio como lido para o colaborador logado (some só para ele). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: row, error: errRow } = await supabase
      .from('sugestoes_reclamacoes')
      .select('id, tipo, created_at')
      .eq('id', id)
      .maybeSingle();

    if (errRow) return NextResponse.json({ ok: false, erro: errRow.message }, { status: 500 });
    if (!row) return NextResponse.json({ ok: false, erro: 'Elogio não encontrado' }, { status: 404 });
    if (String(row.tipo) !== 'elogio') {
      return NextResponse.json({ ok: false, erro: 'Só elogios podem ser marcados como lidos.' }, { status: 400 });
    }
    if (!elogioVisivelNoPrazoRede(String(row.created_at ?? ''))) {
      return NextResponse.json({ ok: false, erro: 'Este elogio já saiu do período de exibição.' }, { status: 410 });
    }

    const agora = new Date().toISOString();
    const { error } = await supabase.from('elogio_leituras').upsert(
      {
        sugestao_id: id,
        colaborador_id: colaboradorId,
        lido_em: agora,
      },
      { onConflict: 'sugestao_id,colaborador_id' }
    );

    if (error) {
      if (/elogio_leituras|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({
          ok: false,
          erro: 'Tabela de leitura ainda não existe — aplique a migration 066.',
        }, { status: 503 });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
