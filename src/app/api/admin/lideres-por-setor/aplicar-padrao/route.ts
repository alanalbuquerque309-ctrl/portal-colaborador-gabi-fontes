import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { aplicarConfigLiderancaOperacional } from '@/lib/aplicar-config-lideranca';
import { sincronizarVinculosTodosColaboradores } from '@/lib/sincronizar-vinculos-lideranca';

/**
 * Aplica o mapa operacional (gerentes por unidade, Daniel em CD/Motorista/Administração/RH, etc.)
 * em `lideres_por_setor`, desativa vínculos fora do mapa e materializa `colaboradores_lideres`.
 */
export async function POST() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const config = await aplicarConfigLiderancaOperacional(supabase);
    const vinculos = await sincronizarVinculosTodosColaboradores(supabase);

    return NextResponse.json({
      ok: true,
      config,
      vinculos,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    if (/lideres_por_setor|does not exist/i.test(msg)) {
      return NextResponse.json(
        {
          ok: false,
          erro: 'Tabela lideres_por_setor ausente. Aplique a migration 032_lideres_por_setor.sql no Supabase.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
