import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const TIPOS = ['sugestao', 'reclamacao'] as const;

/** GET: Minhas mensagens + feed de sugestões da unidade (para curtir). */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data: minhasRaw, error: errMinhas } = await supabase
      .from('sugestoes_reclamacoes')
      .select('id, tipo, texto, anonimo, created_at, visualizado_em, curtidas')
      .eq('colaborador_id', colaboradorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (errMinhas) {
      return NextResponse.json({ ok: false, erro: errMinhas.message }, { status: 500 });
    }

    const minhas = (minhasRaw ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      tipo: r.tipo,
      texto: r.texto,
      anonimo: r.anonimo === true,
      created_at: r.created_at,
      visualizado_em: r.visualizado_em ?? null,
      curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
    }));

    let feed: Array<{
      id: string;
      texto: string;
      created_at: string;
      curtidas: number;
      autor: string;
      curtiu: boolean;
    }> = [];

    if (unidadeId) {
      const { data: feedRaw, error: errFeed } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id, texto, created_at, curtidas, colaborador_id, anonimo, colaboradores(nome)')
        .eq('unidade_id', unidadeId)
        .eq('tipo', 'sugestao')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!errFeed && feedRaw?.length) {
        const ids = feedRaw.map((r: { id: string }) => r.id);
        const { data: minhasCurtidas } = await supabase
          .from('sugestao_curtidas')
          .select('sugestao_id')
          .eq('colaborador_id', colaboradorId)
          .in('sugestao_id', ids);

        const curtiuSet = new Set((minhasCurtidas ?? []).map((c) => c.sugestao_id));

        feed = feedRaw.map((r: Record<string, unknown>) => {
          const anon = r.anonimo === true;
          const nome = (r.colaboradores as { nome?: string } | null)?.nome;
          const autor = anon ? 'Colega' : nome ?? 'Colega';
          return {
            id: String(r.id ?? ''),
            texto: String(r.texto ?? ''),
            created_at: String(r.created_at ?? ''),
            curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
            autor,
            curtiu: curtiuSet.has(String(r.id)),
          };
        });
      }
    }

    return NextResponse.json({ ok: true, minhas, feed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

/** POST: Envia sugestão ou reclamação. */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { tipo?: string; texto?: string; anonimo?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const tipo = body.tipo?.toLowerCase();
  if (!tipo || !TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return NextResponse.json({ ok: false, erro: 'Tipo inválido. Use: sugestao ou reclamacao.' }, { status: 400 });
  }

  const texto = body.texto?.trim();
  if (!texto || texto.length < 5) {
    return NextResponse.json({ ok: false, erro: 'Escreva pelo menos 5 caracteres.' }, { status: 400 });
  }

  const anonimo = body.anonimo === true;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sugestoes_reclamacoes')
      .insert({
        colaborador_id: anonimo ? null : colaboradorId,
        tipo,
        texto,
        anonimo,
        unidade_id: unidadeId || null,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
