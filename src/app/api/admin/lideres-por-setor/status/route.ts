import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/** Verifica se a tabela `lideres_por_setor` (migration 032) já foi aplicada no Supabase. */
export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('lideres_por_setor').select('id').limit(1);
    if (error) {
      const missing = /lideres_por_setor|does not exist|relation/i.test(error.message);
      return NextResponse.json({
        ok: true,
        tabela_existe: false,
        migration: '032_lideres_por_setor.sql',
        detalhe: error.message,
      });
    }
    return NextResponse.json({
      ok: true,
      tabela_existe: true,
      migration: '032_lideres_por_setor.sql',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
