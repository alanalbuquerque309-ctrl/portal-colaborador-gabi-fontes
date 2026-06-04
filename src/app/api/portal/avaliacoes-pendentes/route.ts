import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcularPendenciasSemana,
  type FiltroPendenciasSemana,
} from '@/lib/avaliacao-pendentes-semana';
import {
  podeVerRelatoriosAvaliacoesCompletos,
  relatorioRestringeUnidade,
} from '@/lib/avaliacoes-relatorio-access';
import { isDateIsoAvaliacao, semanaAvaliacaoEquipePadraoISO } from '@/lib/semana-referencia';

function parseFiltro(raw: string | null): FiltroPendenciasSemana {
  const v = raw?.trim() ?? 'gerente';
  if (v === 'gerente' || v === 'rh_complemento' || v === 'rh_rede' || v === 'todos') return v;
  return 'gerente';
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dataRaw = searchParams.get('data')?.trim() || semanaAvaliacaoEquipePadraoISO();
  if (!isDateIsoAvaliacao(dataRaw)) {
    return NextResponse.json({ ok: false, erro: 'Parâmetro data inválido (YYYY-MM-DD)' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('role, unidade_id')
      .eq('id', colaboradorId)
      .single();

    if (errEu || !eu) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404 });
    }

    const role = (eu as { role?: string }).role ?? '';
    if (!podeVerRelatoriosAvaliacoesCompletos(role)) {
      return NextResponse.json({ ok: false, erro: 'Sem permissão' }, { status: 403 });
    }

    let unidadeId: string | undefined;
    let unidadeSlug = searchParams.get('unidade_slug')?.trim() || undefined;

    if (relatorioRestringeUnidade(role)) {
      unidadeId = String((eu as { unidade_id?: string }).unidade_id ?? '');
      unidadeSlug = undefined;
    }

    const resultado = await calcularPendenciasSemana(supabase, {
      dataIso: dataRaw,
      unidadeId,
      unidadeSlug,
      filtro: parseFiltro(searchParams.get('filtro')),
      busca: searchParams.get('q')?.trim() || undefined,
      rhAvaliadorId: colaboradorId,
    });

    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
