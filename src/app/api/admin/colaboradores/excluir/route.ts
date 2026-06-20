import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminCadastroEditApi } from '@/lib/admin-auth';

/** Exclui colaborador. Admin, RH e sócios. */
export async function DELETE(req: Request) {
  const auth = await requireAdminCadastroEditApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, erro: 'ID obrigatório' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('colaboradores').delete().eq('id', id);

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, erro: 'Erro ao excluir' },
      { status: 500 }
    );
  }
}
