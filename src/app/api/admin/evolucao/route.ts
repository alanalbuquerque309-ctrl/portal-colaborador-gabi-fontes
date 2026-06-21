import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { montarPayloadEvolucaoRede, payloadSomenteResumo } from '@/lib/evolucao-rede';

/** Saúde da equipe — evolução semanal (colaboradores, unidades, rede). Acesso: admin completo + RH. */
export async function GET(req: Request) {
  const ctx = await getAdminViewerContext();
  if (!ctx) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unidade_slug = searchParams.get('unidade_slug')?.trim() || undefined;
  const setor = searchParams.get('setor')?.trim() || undefined;
  const resumo = searchParams.get('resumo') === '1' || searchParams.get('resumo') === 'true';
  const incluir_criterios = searchParams.get('criterios') !== '0';

  try {
    const supabase = createAdminClient();
    const payload = await montarPayloadEvolucaoRede(supabase, {
      unidade_slug,
      setor,
      incluir_criterios: !resumo && incluir_criterios,
    });

    if (resumo) {
      return NextResponse.json({ ok: true, ...payloadSomenteResumo(payload) });
    }

    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao calcular evolução';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
