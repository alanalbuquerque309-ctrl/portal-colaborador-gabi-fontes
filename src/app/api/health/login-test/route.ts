import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CPF = '05376259765';

/**
 * Diagnóstico de login (apenas desenvolvimento).
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, erro: 'Não disponível' }, { status: 404 });
  }
  const steps: Record<string, unknown> = {};
  try {
    const supabase = createAdminClient();

    // 1. Unidades
    const u = await supabase.from('unidades').select('id, slug');
    steps.unidades_ok = !u.error;
    steps.unidades_count = u.data?.length ?? 0;
    steps.unidades_erro = u.error?.message ?? null;

    const matriz = u.data?.find((x) => x.slug === 'matriz') ?? u.data?.[0];
    steps.matriz_id = matriz?.id ?? null;

    if (!matriz?.id) {
      return NextResponse.json({ steps, concluido: false }, { status: 200 });
    }

    // 2. Colaborador existente
    const c = await supabase
      .from('colaboradores')
      .select('id, unidade_id')
      .eq('cpf', CPF)
      .maybeSingle();
    steps.colab_existe = !!c.data;
    steps.colab_erro = c.error?.message ?? null;

    if (c.data) {
      steps.colab_id = c.data.id;
      steps.colab_unidade = c.data.unidade_id;
      return NextResponse.json({ steps, concluido: true, msg: 'Login deve funcionar' }, { status: 200 });
    }

    // 3. Tentar insert (simula alan-entrar)
    const ins = await supabase
      .from('colaboradores')
      .insert({
        cpf: CPF,
        nome: 'Alan Albuquerque',
        unidade_id: matriz.id,
        onboarding_completo: true,
        role: 'socio',
      })
      .select('id, unidade_id')
      .single();

    steps.insert_ok = !ins.error;
    steps.insert_erro = ins.error?.message ?? null;
    steps.insert_code = ins.error?.code ?? null;

    return NextResponse.json({
      steps,
      concluido: !ins.error,
      msg: ins.error ? `Falha no insert: ${ins.error.message}` : 'Login deve funcionar agora',
    });
  } catch (e) {
    steps.excecao = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ steps, concluido: false }, { status: 200 });
  }
}
