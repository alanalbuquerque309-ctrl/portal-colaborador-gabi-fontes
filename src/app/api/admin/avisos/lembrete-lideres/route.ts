import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerPendenciasSemanaRede } from '@/lib/bonificacao-access';
import { calcularPendenciasSemana } from '@/lib/avaliacao-pendentes-semana';
import { montarPreviewAvisoLideres } from '@/lib/avisos-lembrete-lideres';
import { slugUnidadeReferenciaPublico } from '@/lib/avisos-publico';
import { isDateIsoAvaliacao } from '@/lib/semana-referencia';

export const dynamic = 'force-dynamic';

async function autorizadoGerarAvisoLideres(): Promise<boolean> {
  const ctx = await getAdminViewerContext();
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerPendenciasSemanaRede(ctx.role);
}

async function unidadeIdMatriz(supabase: ReturnType<typeof createAdminClient>) {
  const slug = slugUnidadeReferenciaPublico('lideranca');
  const { data } = await supabase.from('unidades').select('id').eq('slug', slug).maybeSingle();
  return data?.id ? String(data.id) : null;
}

/** Pré-visualização do aviso para líderes com pendências na semana. */
export async function GET(req: Request) {
  if (!(await autorizadoGerarAvisoLideres())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dataRaw = searchParams.get('data')?.trim();
  if (dataRaw && !isDateIsoAvaliacao(dataRaw)) {
    return NextResponse.json({ ok: false, erro: 'Parâmetro data inválido' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await calcularPendenciasSemana(supabase, {
      dataIso: dataRaw || undefined,
      filtro: 'gerente',
    });
    const preview = montarPreviewAvisoLideres(resultado);

    return NextResponse.json({
      ok: true,
      preview,
      meta: resultado.meta,
      resumo: resultado.resumo,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** Publica aviso só para liderança (após confirmação no admin). */
export async function POST(req: Request) {
  if (!(await autorizadoGerarAvisoLideres())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  let body: {
    confirmar?: boolean;
    data?: string;
    titulo?: string;
    conteudo?: string;
    exige_confirmacao?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  if (body.confirmar !== true) {
    return NextResponse.json(
      { ok: false, erro: 'Confirme a publicação (confirmar: true).' },
      { status: 400 }
    );
  }

  const dataRaw = body.data?.trim();
  if (dataRaw && !isDateIsoAvaliacao(dataRaw)) {
    return NextResponse.json({ ok: false, erro: 'Data inválida' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await calcularPendenciasSemana(supabase, {
      dataIso: dataRaw || undefined,
      filtro: 'gerente',
    });
    const preview = montarPreviewAvisoLideres(resultado);

    if (preview.lideres.length === 0) {
      return NextResponse.json(
        { ok: false, erro: 'Não há líderes com pendências para avisar nesta semana.' },
        { status: 409 }
      );
    }

    const unidadeId = await unidadeIdMatriz(supabase);
    if (!unidadeId) {
      return NextResponse.json({ ok: false, erro: 'Unidade de referência inválida' }, { status: 500 });
    }

    const titulo = body.titulo?.trim() || preview.titulo;
    const conteudo = body.conteudo?.trim() || preview.conteudo;
    const exigeConfirmacao = body.exige_confirmacao !== false;

    const payloadBase = {
      titulo,
      conteudo,
      unidade_id: unidadeId,
      ativo: true,
      exige_confirmacao: exigeConfirmacao,
      data_publicacao: new Date().toISOString(),
    };

    let insert = await supabase
      .from('avisos')
      .insert({ ...payloadBase, publico_alvo: 'lideranca' })
      .select('id, titulo')
      .single();

    if (insert.error && /publico_alvo/i.test(insert.error.message)) {
      insert = await supabase.from('avisos').insert(payloadBase).select('id, titulo').single();
    }

    if (insert.error) {
      return NextResponse.json({ ok: false, erro: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      aviso: insert.data,
      lideres_avisados: preview.lideres.length,
      total_pendentes: preview.total_pendentes_lider,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
