import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Retorna dados do perfil do colaborador logado. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('nome, email, telefone, cargo, setor, foto_url, role, unidades(nome)')
      .eq('id', colaboradorId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const unidade = Array.isArray(data.unidades) ? data.unidades[0] : data.unidades;
    const unidadeNome = unidade && typeof unidade === 'object' && 'nome' in unidade ? unidade.nome : undefined;

    return NextResponse.json({
      ok: true,
      colaborador: {
        nome: data.nome ?? '',
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        cargo: data.cargo ?? null,
        setor: (data as { setor?: string | null }).setor ?? null,
        foto_url: data.foto_url ?? null,
        role: (data as { role?: string }).role ?? null,
        unidades: unidadeNome != null ? { nome: unidadeNome } : undefined,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
