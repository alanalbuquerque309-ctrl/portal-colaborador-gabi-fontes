import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcularVencedorLiderDestaquePeriodo,
  type PeriodoLiderDestaque,
} from '@/lib/lider-inspirador';
import { obterLiderInspiradorCacheado } from '@/lib/cache/portal-reconhecimentos-cache';

export const dynamic = 'force-dynamic';

const PERIODOS: PeriodoLiderDestaque[] = ['semanal', 'mensal', 'anual'];

/** Vencedor do Líder Inspirador (semanal, mensal ou anual). */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get('periodo') ?? 'semanal';
  const periodo: PeriodoLiderDestaque = PERIODOS.includes(raw as PeriodoLiderDestaque)
    ? (raw as PeriodoLiderDestaque)
    : 'semanal';

  try {
    if (periodo === 'semanal') {
      const resultado = await obterLiderInspiradorCacheado();
      return NextResponse.json(
        {
          ok: true,
          periodo: 'semanal' as const,
          periodo_rotulo: resultado.semana_rotulo,
          semana_inicio: resultado.semana_inicio,
          semana_rotulo: resultado.semana_rotulo,
          vencedor: resultado.vencedor,
        },
        { headers: { 'Cache-Control': 'private, max-age=60' } }
      );
    }

    const supabase = createAdminClient();
    const resultado = await calcularVencedorLiderDestaquePeriodo(supabase, periodo);
    return NextResponse.json(
      {
        ok: true,
        periodo: resultado.periodo,
        periodo_rotulo: resultado.periodo_rotulo,
        semana_rotulo: resultado.periodo_rotulo,
        vencedor: resultado.vencedor,
      },
      { headers: { 'Cache-Control': 'private, max-age=120' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
