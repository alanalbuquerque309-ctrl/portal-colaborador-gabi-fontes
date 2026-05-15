import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { nomesPorIds } from '@/lib/equipe-chat-format';
import { getEquipeChatViewer, isMissingEquipeChatTable, normalizeMensagem } from '@/lib/equipe-chat-auth';

export async function GET() {
  const viewer = await getEquipeChatViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('equipe_chat_mensagens')
      .select('id, autor_id, mensagem, created_at')
      .is('destinatario_id', null)
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) {
      if (isMissingEquipeChatTable(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Chat da equipe em ativação. Aplique a migração 030 no Supabase.', code: 'equipe_chat_missing_table' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const nomes = await nomesPorIds(rows.map((r) => String(r.autor_id)));
    const itens = rows.map((r) => ({
      id: r.id,
      autor_id: r.autor_id,
      autor_nome: nomes.get(String(r.autor_id)) ?? 'Equipe',
      mensagem: r.mensagem,
      created_at: r.created_at,
    }));

    return NextResponse.json({ ok: true, itens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const viewer = await getEquipeChatViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  let body: { mensagem?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const mensagem = normalizeMensagem(String(body.mensagem ?? ''));
  if (mensagem.length < 2) {
    return NextResponse.json({ ok: false, erro: 'Mensagem muito curta.' }, { status: 400 });
  }
  if (mensagem.length > 1500) {
    return NextResponse.json({ ok: false, erro: 'Mensagem muito longa (máx. 1500 caracteres).' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('equipe_chat_mensagens')
      .insert({ autor_id: viewer.id, destinatario_id: null, mensagem })
      .select('id, autor_id, mensagem, created_at')
      .single();

    if (error) {
      if (isMissingEquipeChatTable(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Chat da equipe em ativação. Aplique a migração 030 no Supabase.', code: 'equipe_chat_missing_table' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      item: data
        ? {
            id: data.id,
            autor_id: data.autor_id,
            autor_nome: viewer.nome,
            mensagem: data.mensagem,
            created_at: data.created_at,
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
