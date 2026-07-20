import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPortalSessionFromCookies } from '@/lib/portal-session-server';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Janela “online”: último ping dentro deste intervalo (heartbeat de 2 min). */
const ONLINE_MINUTOS = 5;

function tabelaPresencaInexistente(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('portal_presenca') && (m.includes('does not exist') || m.includes('schema cache'));
}

/**
 * Lista colaboradores da mesma unidade com ping recente.
 * Heurística: não é “tempo real” absoluto; aba depende do heartbeat.
 */
export async function GET() {
  const sess = await getPortalSessionFromCookies();
  if (!sess) {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createAdminClient();

    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, nome, unidade_id')
      .eq('id', sess.colaboradorId)
      .maybeSingle();

    if (errEu) {
      return NextResponse.json({ ok: false, erro: errEu.message }, { status: 500, headers: NO_STORE });
    }
    if (!eu) {
      return NextResponse.json({ ok: false, erro: 'Colaborador não encontrado' }, { status: 404, headers: NO_STORE });
    }

    const unidadeId = typeof (eu as { unidade_id?: string }).unidade_id === 'string'
      ? String((eu as { unidade_id: string }).unidade_id)
      : sess.unidadeId || '';

    if (!unidadeId) {
      return NextResponse.json(
        {
          ok: true,
          limite_minutos: ONLINE_MINUTOS,
          unidade_nome: null,
          itens: [],
          aviso: 'Sem unidade na sessão',
        },
        { headers: NO_STORE }
      );
    }

    const { data: unRow } = await supabase
      .from('unidades')
      .select('nome')
      .eq('id', unidadeId)
      .maybeSingle();
    const unidadeNome = unRow && typeof (unRow as { nome?: string }).nome === 'string'
      ? String((unRow as { nome: string }).nome)
      : null;

    const desde = new Date(Date.now() - ONLINE_MINUTOS * 60 * 1000).toISOString();

    const { data: colegas, error: errC } = await supabase
      .from('colaboradores')
      .select('id, nome')
      .eq('unidade_id', unidadeId)
      .order('nome');

    if (errC) {
      return NextResponse.json({ ok: false, erro: errC.message }, { status: 500, headers: NO_STORE });
    }

    const idsUnidade = (colegas ?? []).map((c) => String((c as { id: string }).id));
    if (idsUnidade.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          limite_minutos: ONLINE_MINUTOS,
          unidade_nome: unidadeNome,
          voce_id: String((eu as { id: string }).id),
          itens: [],
        },
        { headers: NO_STORE }
      );
    }

    const { data: presRows, error: errP } = await supabase
      .from('portal_presenca')
      .select('colaborador_id')
      .in('colaborador_id', idsUnidade)
      .gte('ultimo_ping_at', desde);

    if (errP) {
      if (tabelaPresencaInexistente(errP.message)) {
        return NextResponse.json(
          {
            ok: true,
            code: 'presenca_missing_table',
            limite_minutos: ONLINE_MINUTOS,
            unidade_nome: unidadeNome,
            voce_id: String((eu as { id: string }).id),
            itens: [],
          },
          { headers: NO_STORE }
        );
      }
      return NextResponse.json({ ok: false, erro: errP.message }, { status: 500, headers: NO_STORE });
    }

    const idsComPing = new Set((presRows ?? []).map((r) => String((r as { colaborador_id: string }).colaborador_id)));

    const lista = (colegas ?? [])
      .filter((c) => idsComPing.has(String((c as { id: string }).id)))
      .map((c) => ({
        id: String((c as { id: string }).id),
        nome: String((c as { nome?: string }).nome ?? 'Colaborador'),
      }));

    return NextResponse.json(
      {
        ok: true,
        limite_minutos: ONLINE_MINUTOS,
        unidade_nome: unidadeNome,
        voce_id: String((eu as { id: string }).id),
        itens: lista,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
