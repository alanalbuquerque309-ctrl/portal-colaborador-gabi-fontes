import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularPendenciasSemana,
  type FiltroPendenciasSemana,
} from '@/lib/avaliacao-pendentes-semana';
import { autorizadoPendenciasRede } from '@/lib/avaliacoes-pendentes-auth';
import { obterPendenciasSemanaRedeCacheadas } from '@/lib/cache/servidor-operacional';
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
  const auth = await autorizadoPendenciasRede();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status, headers: NO_STORE });
  }

  const { searchParams } = new URL(req.url);
  const dataRaw = searchParams.get('data')?.trim();
  if (dataRaw && !isDateIsoAvaliacao(dataRaw)) {
    return NextResponse.json(
      { ok: false, erro: 'Parâmetro data inválido (YYYY-MM-DD)' },
      { status: 400, headers: NO_STORE }
    );
  }

  const somenteResumo = searchParams.get('resumo') === '1';
  const filtro = parseFiltro(searchParams.get('filtro'));
  const unidadeSlug = searchParams.get('unidade_slug')?.trim() || undefined;
  const busca = searchParams.get('q')?.trim() || undefined;
  const dataIso = dataRaw || undefined;

  try {
    const supabase = createAdminClient();

    const podeCachear =
      filtro === 'pendentes' &&
      !unidadeSlug &&
      !busca &&
      !dataIso &&
      !somenteResumo;

    const resultado = podeCachear
      ? await obterPendenciasSemanaRedeCacheadas(auth.rhAvaliadorId)
      : await calcularPendenciasSemana(supabase, {
          dataIso,
          unidadeSlug,
          filtro,
          busca,
          rhAvaliadorId: auth.rhAvaliadorId,
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
