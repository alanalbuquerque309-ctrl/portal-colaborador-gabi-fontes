import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CPF_ALAN = '05376259765';

/** Cadastra Alan automaticamente quando tenta login e não está no banco. Sem auth. */
export async function POST(req: Request) {
  let body: { cpf?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const cpf = String(body.cpf ?? '').replace(/\D/g, '');
  if (cpf !== CPF_ALAN) {
    return NextResponse.json({ ok: false, erro: 'CPF não autorizado' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data: unidades } = await supabase
      .from('unidades')
      .select('id')
      .eq('slug', 'mesquita')
      .limit(1);

    const unidadeId = unidades?.[0]?.id;
    if (!unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Unidade Mesquita não existe' }, { status: 500 });
    }

    const { data: existente } = await supabase
      .from('colaboradores')
      .select('id, unidade_id')
      .eq('cpf', cpf)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({
        ok: true,
        colaborador: { id: existente.id, unidade_id: existente.unidade_id, role: 'socio' },
      });
    }

    const insertData: Record<string, unknown> = {
      cpf,
      nome: 'Alan Albuquerque',
      unidade_id: unidadeId,
      onboarding_completo: true,
    };

    const { data: novo, error } = await supabase
      .from('colaboradores')
      .insert(insertData)
      .select('id, unidade_id')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      colaborador: { id: novo.id, unidade_id: novo.unidade_id, role: 'socio' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
