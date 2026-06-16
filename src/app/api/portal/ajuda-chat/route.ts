import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendAjudaMensagem } from '@/lib/ajuda-chat-threads';

function normalizeMensagem(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

function isMissingAjudaChatTable(errorMessage: string): boolean {
  const msg = String(errorMessage || '').toLowerCase();
  return msg.includes('ajuda_chat') && (msg.includes('schema cache') || msg.includes('does not exist'));
}

function formatItem(row: Record<string, unknown>) {
  const respondidoPor = row.respondido_por as { nome?: string } | null;
  return {
    id: row.id,
    mensagem: row.mensagem,
    resposta: row.resposta,
    created_at: row.created_at,
    respondido_em: row.respondido_em,
    lido_admin_em: row.lido_admin_em,
    respondido_por_nome: respondidoPor?.nome ?? null,
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ajuda_chat')
      .select(
        'id, mensagem, resposta, created_at, respondido_em, lido_admin_em, respondido_por:colaboradores!ajuda_chat_respondido_por_id_fkey(nome)'
      )
      .eq('colaborador_id', colaboradorId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      if (isMissingAjudaChatTable(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Canal de ajuda em ativação. Tente novamente em instantes.', code: 'ajuda_chat_missing_table' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    const itens = Array.isArray(data) ? data.map((r) => formatItem(r as Record<string, unknown>)) : [];
    return NextResponse.json({ ok: true, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  const unidadeId = cookieStore.get('portal_unidade_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: { mensagem?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const mensagem = normalizeMensagem(String(body.mensagem ?? ''));
  if (mensagem.length < 3) {
    return NextResponse.json({ ok: false, erro: 'Mensagem muito curta.' }, { status: 400 });
  }
  if (mensagem.length > 1500) {
    return NextResponse.json({ ok: false, erro: 'Mensagem muito longa (máx. 1500 caracteres).' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: candidatas, error: errAberta } = await supabase
      .from('ajuda_chat')
      .select('id, mensagem, resposta, respondido_em')
      .eq('colaborador_id', colaboradorId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (errAberta && !isMissingAjudaChatTable(errAberta.message)) {
      return NextResponse.json({ ok: false, erro: errAberta.message }, { status: 500 });
    }

    const aberta = (candidatas ?? []).find((row) => {
      const em = row.respondido_em;
      if (em != null && String(em).trim() !== '') return false;
      const resp = row.resposta;
      if (resp != null && String(resp).trim() !== '') return false;
      return true;
    });

    if (aberta?.id) {
      const mensagemAtualizada = appendAjudaMensagem(String(aberta.mensagem ?? ''), mensagem);
      const { data, error } = await supabase
        .from('ajuda_chat')
        .update({ mensagem: mensagemAtualizada })
        .eq('id', aberta.id)
        .select(
          'id, mensagem, resposta, created_at, respondido_em, lido_admin_em, respondido_por:colaboradores!ajuda_chat_respondido_por_id_fkey(nome)'
        )
        .single();
      if (error) {
        if (isMissingAjudaChatTable(error.message)) {
          return NextResponse.json(
            {
              ok: false,
              erro: 'Canal de ajuda em ativação. Tente novamente em instantes.',
              code: 'ajuda_chat_missing_table',
            },
            { status: 503 }
          );
        }
        return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        item: data ? formatItem(data as Record<string, unknown>) : null,
        agrupado: true,
      });
    }

    const { data, error } = await supabase
      .from('ajuda_chat')
      .insert({
        colaborador_id: colaboradorId,
        unidade_id: unidadeId || null,
        mensagem,
      })
      .select(
        'id, mensagem, resposta, created_at, respondido_em, lido_admin_em, respondido_por:colaboradores!ajuda_chat_respondido_por_id_fkey(nome)'
      )
      .single();
    if (error) {
      if (isMissingAjudaChatTable(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Canal de ajuda em ativação. Tente novamente em instantes.', code: 'ajuda_chat_missing_table' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, item: data ? formatItem(data as Record<string, unknown>) : null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
