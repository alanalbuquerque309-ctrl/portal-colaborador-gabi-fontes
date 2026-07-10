import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcularPendenciasSemana,
  type FiltroPendenciasSemana,
} from '@/lib/avaliacao-pendentes-semana';
import { obterPendenciasSemanaRedeCacheadas } from '@/lib/cache/servidor-operacional';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { isDateIsoAvaliacao } from '@/lib/semana-referencia';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function parseFiltro(raw: string | null): FiltroPendenciasSemana {
  const v = raw?.trim() ?? 'pendentes';
  if (
    v === 'pendentes' ||
    v === 'gerente' ||
    v === 'rh_complemento' ||
    v === 'rh_rede' ||
    v === 'critico_sexta' ||
    v === 'todos'
  ) {
    return v;
  }
  return 'pendentes';
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  const { searchParams } = new URL(req.url);
  const dataRaw = searchParams.get('data')?.trim();
  if (dataRaw && !isDateIsoAvaliacao(dataRaw)) {
    return NextResponse.json(
      { ok: false, erro: 'Parâmetro data inválido (YYYY-MM-DD)' },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const role = (eu as { role?: string }).role ?? '';
    if (!podeVerPendenciasSemanaRede(role)) {
      return NextResponse.json(
        { ok: false, erro: 'Acesso restrito a sócios e administrador.' },
        { status: 403, headers: NO_STORE }
      );
    }

    const somenteResumo = searchParams.get('resumo') === '1';
    const unidadeSlug = searchParams.get('unidade_slug')?.trim() || undefined;
    const busca = searchParams.get('q')?.trim() || undefined;
    const filtro = parseFiltro(searchParams.get('filtro'));

    const podeCachear = filtro === 'pendentes' && !unidadeSlug && !busca && !dataRaw;

    const resultado = podeCachear
      ? await obterPendenciasSemanaRedeCacheadas(colaboradorId)
      : await calcularPendenciasSemana(supabase, {
          dataIso: dataRaw || undefined,
          unidadeSlug,
          filtro,
          busca,
          rhAvaliadorId: colaboradorId,
        });

    if (somenteResumo) {
      return NextResponse.json(
        {
          ok: true,
          total: resultado.itens.length,
          resumo: resultado.resumo,
          meta: resultado.meta,
          data_referencia: resultado.data_referencia,
          intervalo: resultado.intervalo,
        },
        { headers: NO_STORE }
      );
    }

    return NextResponse.json({ ok: true, ...resultado }, { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
