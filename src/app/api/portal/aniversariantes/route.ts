import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Lista aniversariantes do mês (todas as unidades). Requer login no portal. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const mes = new Date().getMonth() + 1;

    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select('id, nome, data_nascimento, foto_url, unidades(nome)')
      .not('data_nascimento', 'is', null);

    const todos = colaboradores ?? [];
    const doMes = todos.filter((c: { data_nascimento: string | null }) => {
      if (!c.data_nascimento) return false;
      return new Date(c.data_nascimento).getMonth() + 1 === mes;
    });

    const resultado = doMes.map((c: Record<string, unknown>) => {
      const un = c.unidades;
      const nomeUnidade = Array.isArray(un) ? (un[0] as { nome?: string })?.nome : (un as { nome?: string })?.nome;
      return {
        id: c.id,
        nome: c.nome,
        data_nascimento: c.data_nascimento,
        foto_url: c.foto_url ?? null,
        unidade_nome: nomeUnidade ?? '',
      };
    });

    return NextResponse.json({ ok: true, aniversariantes: resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
