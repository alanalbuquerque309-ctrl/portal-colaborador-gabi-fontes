import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_COOKIE = 'admin_session';

/** Diagnóstico: descobre por que "CPF não cadastrado" aparece. */
export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== '1') {
    return NextResponse.json({ erro: 'Faça login em /admin primeiro' }, { status: 401 });
  }

  const diag: Record<string, unknown> = {
    service_role_ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  try {
    const supabase = createAdminClient();
    const cpfAlan = '05376259765';

    const [unidadesRes, colaboradoresRes, alanRes] = await Promise.all([
      supabase.from('unidades').select('id, nome, slug'),
      supabase.from('colaboradores').select('id, nome, cpf'),
      supabase.from('colaboradores').select('id, nome, cpf, unidade_id').eq('cpf', cpfAlan).maybeSingle(),
    ]);

    diag.unidades = unidadesRes.data?.length ?? 0;
    diag.unidades_lista = unidadesRes.data?.map((u) => u.nome) ?? [];
    diag.unidades_erro = unidadesRes.error?.message;
    diag.colaboradores_total = colaboradoresRes.data?.length ?? 0;
    diag.cpfs_cadastrados = colaboradoresRes.data?.map((c) => c.cpf) ?? [];
    diag.alan_encontrado = !!alanRes.data;
    diag.alan_erro = alanRes.error?.message;
    diag.alan_dados = alanRes.data ? { id: alanRes.data.id, cpf: alanRes.data.cpf } : null;

    return NextResponse.json(diag);
  } catch (e) {
    diag.excecao = e instanceof Error ? e.message : String(e);
    return NextResponse.json(diag, { status: 500 });
  }
}
