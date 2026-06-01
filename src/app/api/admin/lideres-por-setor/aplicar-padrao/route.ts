import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminLiderancaMapaApi } from '@/lib/admin-auth';
import { aplicarConfigLiderancaOperacional } from '@/lib/aplicar-config-lideranca';
import { sincronizarVinculosTodosColaboradores } from '@/lib/sincronizar-vinculos-lideranca';
import { sincronizarVinculosAvaliacaoDireta } from '@/lib/avaliacao-direta';

/**
 * Aplica o mapa operacional (gerentes por unidade, Daniel em CD/Motorista/Administração/RH, etc.)
 * em `lideres_por_setor`, desativa vínculos fora do mapa e materializa `colaboradores_lideres`.
 */
export async function POST() {
  const auth = await requireAdminLiderancaMapaApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createAdminClient();
    const config = await aplicarConfigLiderancaOperacional(supabase);
    const vinculos = await sincronizarVinculosTodosColaboradores(supabase);
    const avaliacaoDireta = await sincronizarVinculosAvaliacaoDireta(supabase);

    return NextResponse.json({
      ok: true,
      config,
      vinculos,
      avaliacao_direta: avaliacaoDireta,
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
