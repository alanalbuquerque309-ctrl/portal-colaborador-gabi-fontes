import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminFullApi } from '@/lib/admin-auth';
import {
  calcularPendenciasSemana,
  type FiltroPendenciasSemana,
} from '@/lib/avaliacao-pendentes-semana';
import { isDateIsoAvaliacao, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';

function parseFiltro(raw: string | null): FiltroPendenciasSemana {
  const v = raw?.trim() ?? 'todos';
  if (v === 'gerente' || v === 'rh_complemento' || v === 'rh_rede' || v === 'todos') return v;
  return 'todos';
}

export async function GET(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const dataRaw = searchParams.get('data')?.trim() || semanaAvaliacaoEquipePadraoISO();
  if (!isDateIsoAvaliacao(dataRaw)) {
    return NextResponse.json({ ok: false, erro: 'Parâmetro data inválido (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await calcularPendenciasSemana(supabase, {
      dataIso: dataRaw,
      unidadeSlug: searchParams.get('unidade_slug')?.trim() || undefined,
      filtro: parseFiltro(searchParams.get('filtro')),
      busca: searchParams.get('q')?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
