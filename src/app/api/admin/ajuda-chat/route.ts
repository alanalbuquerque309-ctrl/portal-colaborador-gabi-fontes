import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { colaboradoresResumoPorIds } from '@/lib/equipe-chat-format';
import { canResponderAjudaFinal, canVisualizarAjuda, canExcluirMensagensAjuda } from '@/lib/roles';
import { contarTopicosPendentes, type AjudaChatLinha } from '@/lib/ajuda-chat-threads';

const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
} as const;

/** Garante que “pendente” no balão/inbox não inclua linhas já respondidas (inconsistência DB). */
function filtrarSomentePendentes(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.filter((r) => {
    const em = r.respondido_em;
    if (em != null && String(em).trim() !== '') return false;
    const resp = r.resposta;
    if (resp != null && String(resp).trim() !== '') return false;
    return true;
  });
}

async function getViewer() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('colaboradores').select('id, role').eq('id', colaboradorId).maybeSingle();
  if (!data) return null;
  const role = String((data as { role?: string }).role ?? '');
  if (!canVisualizarAjuda(role, colaboradorId)) return null;
  return {
    id: String(data.id),
    role,
    podeResponder: canResponderAjudaFinal(colaboradorId, role),
    podeExcluir: canExcluirMensagensAjuda(role),
  };
}

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401, headers: NO_STORE });

  const { searchParams } = new URL(req.url);
  const somentePendentes = searchParams.get('somente_pendentes') === '1';
  const resumo = searchParams.get('resumo') === '1';

  try {
    const supabase = createAdminClient();

    if (somentePendentes && resumo) {
      const { data, error } = await supabase
        .from('ajuda_chat')
        .select('id, colaborador_id, mensagem, resposta, created_at, respondido_em')
        .is('respondido_em', null)
        .order('created_at', { ascending: false })
        .limit(120);
      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });
      const rows = filtrarSomentePendentes((data ?? []) as Record<string, unknown>[]);
      const pendentes = contarTopicosPendentes(rows as AjudaChatLinha[]);
      return NextResponse.json({ ok: true, pendentes }, { headers: NO_STORE });
    }

    let q = supabase
      .from('ajuda_chat')
      .select(
        'id, colaborador_id, unidade_id, mensagem, resposta, created_at, respondido_em, lido_admin_em, respondido_por_id'
      )
      .order('created_at', { ascending: false })
      .limit(300);
    if (somentePendentes) q = q.is('respondido_em', null);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500, headers: NO_STORE });

    const rowsRaw = (data ?? []) as Record<string, unknown>[];
    const rows = somentePendentes ? filtrarSomentePendentes(rowsRaw) : rowsRaw;

    const colabIds = rows
      .map((r) => (r.colaborador_id != null ? String(r.colaborador_id) : ''))
      .filter(Boolean);
    const respIds = rows
      .map((r) => (r.respondido_por_id != null ? String(r.respondido_por_id) : ''))
      .filter(Boolean);
    const unidadeIds = Array.from(
      new Set(rows.map((r) => (r.unidade_id != null ? String(r.unidade_id) : '')).filter(Boolean))
    );

    const colabs = await colaboradoresResumoPorIds([...colabIds, ...respIds]);

    let unidadePorId: Record<string, string> = {};
    if (unidadeIds.length > 0) {
      const { data: urows } = await supabase.from('unidades').select('id, nome').in('id', unidadeIds);
      for (const u of urows ?? []) {
        unidadePorId[String(u.id)] = String(u.nome ?? '-');
      }
    }

    const itens = rows.map((r: Record<string, unknown>) => {
      const autorId = r.colaborador_id != null ? String(r.colaborador_id) : '';
      const respId = r.respondido_por_id != null ? String(r.respondido_por_id) : '';
      const uid = r.unidade_id != null ? String(r.unidade_id) : '';
      const infoAutor = autorId ? colabs.get(autorId) : undefined;
      const infoResp = respId ? colabs.get(respId) : undefined;
      return {
        id: r.id,
        colaborador_id: r.colaborador_id,
        colaborador_nome: infoAutor?.nome ?? 'Colaborador',
        colaborador_telefone: infoAutor?.telefone ?? null,
        unidade_nome: uid ? unidadePorId[uid] ?? '-' : '-',
        mensagem: r.mensagem,
        resposta: r.resposta,
        created_at: r.created_at,
        respondido_em: r.respondido_em,
        lido_admin_em: r.lido_admin_em,
        respondido_por_nome: respId ? infoResp?.nome ?? null : null,
      };
    }) as AjudaChatLinha[];

    const pendentesTopicos = contarTopicosPendentes(itens);

    /** Lista filtrada já é a fonte da verdade para “pendentes”; evita contagem divergir da lista (balão fantasma). */
    if (somentePendentes) {
      return NextResponse.json(
        {
          ok: true,
          itens,
          pendentes: pendentesTopicos,
          pode_responder: viewer.podeResponder,
          pode_excluir: viewer.podeExcluir,
        },
        { headers: NO_STORE }
      );
    }

    const { data: pendentesRows } = await supabase
      .from('ajuda_chat')
      .select('id, colaborador_id, mensagem, resposta, created_at, respondido_em')
      .is('respondido_em', null)
      .limit(500);

    const pendentesGeral = contarTopicosPendentes((pendentesRows ?? []) as AjudaChatLinha[]);

    return NextResponse.json(
      {
        ok: true,
        itens,
        pendentes: pendentesGeral,
        pode_responder: viewer.podeResponder,
        pode_excluir: viewer.podeExcluir,
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500, headers: NO_STORE });
  }
}
