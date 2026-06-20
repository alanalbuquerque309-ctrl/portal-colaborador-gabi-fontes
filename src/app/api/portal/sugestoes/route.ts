import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePortalRole } from '@/lib/roles';
import { podeEnviarReclamacaoPortal } from '@/lib/bonificacao-access';

const TIPOS = ['sugestao', 'reclamacao', 'elogio'] as const;

async function mapaNomesColaboradores(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (unicos.length === 0) return map;
  const { data } = await supabase.from('colaboradores').select('id, nome').in('id', unicos);
  for (const c of data ?? []) {
    map.set(String((c as { id: string }).id), String((c as { nome?: string }).nome ?? ''));
  }
  return map;
}

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

    const selectsMinhas = [
      'id, tipo, texto, anonimo, created_at, visualizado_em, graos_destaque_em, graos_resposta_bonus, curtidas',
      'id, tipo, texto, anonimo, created_at, visualizado_em, graos_destaque_em, curtidas',
      'id, tipo, texto, anonimo, created_at',
    ];

    let minhasRaw: Record<string, unknown>[] | null = null;
    let errMinhas = '';

    for (const sel of selectsMinhas) {
      const { data, error } = await supabase
        .from('sugestoes_reclamacoes')
        .select(sel)
        .eq('colaborador_id', colaboradorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) {
        minhasRaw = (data ?? []) as unknown as Record<string, unknown>[];
        break;
      }
      errMinhas = error.message;
      if (!/graos_destaque|graos_resposta|visualizado_em|curtidas|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      }
    }

    if (!minhasRaw) {
      return NextResponse.json({ ok: false, erro: errMinhas || 'Erro ao carregar mensagens' }, { status: 500 });
    }

    const minhas = (minhasRaw ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      tipo: r.tipo,
      texto: r.texto,
      anonimo: r.anonimo === true,
      created_at: r.created_at,
      visualizado_em: r.visualizado_em ?? null,
      graos_destaque_em: r.graos_destaque_em ?? null,
      graos_resposta_bonus:
        typeof r.graos_resposta_bonus === 'number' ? r.graos_resposta_bonus : null,
      curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
    }));

    let feed: Array<{
      id: string;
      texto: string;
      created_at: string;
      curtidas: number;
      autor: string;
      curtiu: boolean;
      tipo: string;
    }> = [];

    let feed_reclamacoes: Array<{
      id: string;
      texto: string;
      created_at: string;
      autor: string;
    }> = [];

    const { data: perfil } = await supabase
      .from('colaboradores')
      .select('role')
      .eq('id', colaboradorId)
      .single();
    const meuRole = normalizePortalRole((perfil as { role?: string } | null)?.role);
    const gestaoVeReclamacoes = podeEnviarReclamacaoPortal(meuRole);

    if (unidadeId) {
      const { data: feedRaw, error: errFeed } = await supabase
        .from('sugestoes_reclamacoes')
        .select('id, texto, created_at, curtidas, colaborador_id, anonimo, tipo')
        .eq('unidade_id', unidadeId)
        .in('tipo', ['sugestao', 'elogio'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (!errFeed && feedRaw?.length) {
        const ids = feedRaw.map((r: { id: string }) => r.id);
        const nomesFeed = await mapaNomesColaboradores(
          supabase,
          feedRaw.map((r: { colaborador_id?: string | null }) => String(r.colaborador_id ?? ''))
        );
        const { data: minhasCurtidas } = await supabase
          .from('sugestao_curtidas')
          .select('sugestao_id')
          .eq('colaborador_id', colaboradorId)
          .in('sugestao_id', ids);

        const curtiuSet = new Set((minhasCurtidas ?? []).map((c) => c.sugestao_id));

        feed = feedRaw.map((r: Record<string, unknown>) => {
          const tipoFeed = String(r.tipo ?? 'sugestao');
          const cid = r.colaborador_id ? String(r.colaborador_id) : '';
          const nome = cid ? nomesFeed.get(cid) : undefined;
          return {
            id: String(r.id ?? ''),
            texto: String(r.texto ?? ''),
            created_at: String(r.created_at ?? ''),
            curtidas: typeof r.curtidas === 'number' ? r.curtidas : 0,
            autor: nome?.trim() || 'Colega',
            curtiu: curtiuSet.has(String(r.id)),
            tipo: tipoFeed,
          };
        });
      }

      if (gestaoVeReclamacoes) {
        const { data: reclRaw } = await supabase
          .from('sugestoes_reclamacoes')
          .select('id, texto, created_at, anonimo, colaborador_id')
          .eq('unidade_id', unidadeId)
          .eq('tipo', 'reclamacao')
          .order('created_at', { ascending: false })
          .limit(40);

        const nomesRecl = await mapaNomesColaboradores(
          supabase,
          (reclRaw ?? []).map((r: { colaborador_id?: string | null }) => String(r.colaborador_id ?? ''))
        );

        feed_reclamacoes = (reclRaw ?? []).map((r: Record<string, unknown>) => {
          const anon = r.anonimo === true;
          const cid = r.colaborador_id ? String(r.colaborador_id) : '';
          const nome = cid ? nomesRecl.get(cid) : undefined;
          const autor = anon ? 'Anônimo' : nome?.trim() || '—';
          return {
            id: String(r.id ?? ''),
            texto: String(r.texto ?? ''),
            created_at: String(r.created_at ?? ''),
            autor,
          };
        });
      }
    }

    return NextResponse.json({ ok: true, minhas, feed, feed_reclamacoes, pode_enviar_reclamacao: gestaoVeReclamacoes });
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
    return NextResponse.json(
      { ok: false, erro: 'Tipo inválido. Use: sugestao, reclamacao ou elogio.' },
      { status: 400 }
    );
  }

  const texto = body.texto?.trim();
  if (!texto || texto.length < 5) {
    return NextResponse.json({ ok: false, erro: 'Escreva pelo menos 5 caracteres.' }, { status: 400 });
  }

  const anonimo = tipo === 'reclamacao' && body.anonimo === true;

  if (tipo === 'reclamacao') {
    try {
      const supabaseCheck = createAdminClient();
      const { data: perfil } = await supabaseCheck
        .from('colaboradores')
        .select('role')
        .eq('id', colaboradorId)
        .maybeSingle();
      const role = normalizePortalRole((perfil as { role?: string } | null)?.role);
      if (!podeEnviarReclamacaoPortal(role)) {
        return NextResponse.json(
          { ok: false, erro: 'Reclamações são registradas apenas pela gestão (sócios e ADM).' },
          { status: 403 }
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro';
      return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
    }
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('sugestoes_reclamacoes')
      .insert({
        colaborador_id: colaboradorId,
        tipo,
        texto,
        anonimo,
        unidade_id: unidadeId || null,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    if (tipo === 'sugestao') {
      const { syncGraosColaboradorSeAplicavel } = await import('@/lib/graos/sync-hook');
      await syncGraosColaboradorSeAplicavel(supabase, colaboradorId);
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
