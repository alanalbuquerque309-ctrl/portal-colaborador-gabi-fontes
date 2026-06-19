import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcularPendenciasSemana,
  type FiltroPendenciasSemana,
} from '@/lib/avaliacao-pendentes-semana';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { getAdminViewerContext } from '@/lib/admin-auth';
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
    v === 'todos'
  ) {
    return v;
  }
  return 'pendentes';
}

async function autorizadoPendenciasRede(): Promise<
  { ok: true; rhAvaliadorId?: string } | { ok: false; status: number; erro: string }
> {
  const ctx = await getAdminViewerContext();
  if (ctx) {
    if (ctx.kind === 'password_session') return { ok: true };
    if (podeVerPendenciasSemanaRede(ctx.role)) return { ok: true };
    return { ok: false, status: 403, erro: 'Acesso restrito a sócios e administrador.' };
  }

  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return { ok: false, status: 401, erro: 'Faça login no portal' };
  }

  const supabase = createAdminClient();
  const { data: eu } = await supabase
    .from('colaboradores')
    .select('role')
    .eq('id', colaboradorId)
    .maybeSingle();

  const role = (eu as { role?: string } | null)?.role ?? '';
  if (!podeVerPendenciasSemanaRede(role)) {
    return { ok: false, status: 403, erro: 'Acesso restrito a sócios e administrador.' };
  }

  return { ok: true, rhAvaliadorId: colaboradorId };
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

  try {
    const supabase = createAdminClient();
    const resultado = await calcularPendenciasSemana(supabase, {
      dataIso: dataRaw || undefined,
      unidadeSlug: searchParams.get('unidade_slug')?.trim() || undefined,
      filtro: parseFiltro(searchParams.get('filtro')),
      busca: searchParams.get('q')?.trim() || undefined,
      rhAvaliadorId: auth.rhAvaliadorId,
    });

    if (somenteResumo) {
      return NextResponse.json(
        {
          ok: true,
          total: resultado.itens.length,
          resumo: resultado.resumo,
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
