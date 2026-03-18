import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_COOKIE = 'admin_session';

/** Cadastra Alan via service role — resolve "CPF não cadastrado" quando inserção normal falha. */
export async function POST() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const cpf = '05376259765';
  const nome = 'Alan Albuquerque';

  try {
    const supabase = createAdminClient();
    const { data: unidades } = await supabase
      .from('unidades')
      .select('id')
      .eq('slug', 'mesquita')
      .limit(1);

    const unidadeId = unidades?.[0]?.id;
    if (!unidadeId) {
      return NextResponse.json(
        { ok: false, erro: 'Unidade Mesquita não encontrada. Execute as migrations.' },
        { status: 500 }
      );
    }

    const { data: existente } = await supabase
      .from('colaboradores')
      .select('id, cpf')
      .eq('cpf', cpf)
      .single();

    if (existente) {
      const { error: updErr } = await supabase
        .from('colaboradores')
        .update({
          nome,
          onboarding_completo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existente.id);
      if (updErr) {
        return NextResponse.json({ ok: false, erro: updErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, acao: 'atualizado' });
    }

    const insertData: Record<string, unknown> = {
      cpf,
      nome,
      unidade_id: unidadeId,
      onboarding_completo: true,
    };

    const { error } = await supabase.from('colaboradores').insert(insertData).select('id').single();

    if (error) {
      if (error.code === '42703') {
        return NextResponse.json(
          { ok: false, erro: `Coluna inexistente: ${error.message}. Execute a migration 003.` },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, acao: 'cadastrado' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao cadastrar';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
