import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { contatoPermitido } from '@/lib/equipe-chat-contatos';
import { nomesPorIds } from '@/lib/equipe-chat-format';
import {
  getEquipeChatViewer,
  isMissingEquipeChatTable,
  isUuid,
  normalizeMensagem,
} from '@/lib/equipe-chat-auth';

function parValido(viewerId: string, com: string, autorId: string, destId: string | null): boolean {
  if (!destId) return false;
  return (
    (autorId === viewerId && destId === com) ||
    (autorId === com && destId === viewerId)
  );
}

export async function GET(req: Request) {
  const viewer = await getEquipeChatViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  const com = new URL(req.url).searchParams.get('com')?.trim() ?? '';
  if (!isUuid(com)) {
    return NextResponse.json({ ok: false, erro: 'Destinatário inválido.' }, { status: 400 });
  }
  if (!(await contatoPermitido(viewer.id, com))) {
    return NextResponse.json({ ok: false, erro: 'Contato não permitido.' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('equipe_chat_mensagens')
      .select('id, autor_id, destinatario_id, mensagem, lido_em, created_at')
      .not('destinatario_id', 'is', null)
      .or(`autor_id.eq.${viewer.id},destinatario_id.eq.${viewer.id}`)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) {
      if (isMissingEquipeChatTable(error.message)) {
        return NextResponse.json(
          { ok: false, erro: 'Chat da equipe em ativação. Aplique a migração 030 no Supabase.', code: 'equipe_chat_missing_table' },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const filtrado = (data ?? []).filter((r) =>
      parValido(viewer.id, com, String(r.autor_id), r.destinatario_id ? String(r.destinatario_id) : null)
    );

    await supabase
      .from('equipe_chat_mensagens')
      .update({ lido_em: new Date().toISOString() })
      .eq('destinatario_id', viewer.id)
      .eq('autor_id', com)
      .is('lido_em', null);

    const nomes = await nomesPorIds(filtrado.map((r) => String(r.autor_id)));
    const itens = filtrado.map((r) => {
      const autorId = String(r.autor_id);
      return {
        id: r.id,
        autor_id: autorId,
        autor_nome: nomes.get(autorId) ?? 'Colaborador',
        destinatario_id: r.destinatario_id,
        mensagem: r.mensagem,
        created_at: r.created_at,
        lido_em: r.lido_em,
        minha: autorId === viewer.id,
      };
    });

    return NextResponse.json({ ok: true, itens, com });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const viewer = await getEquipeChatViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  let body: { destinatario_id?: string; mensagem?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const destinatarioId = String(body.destinatario_id ?? '').trim();
  if (!isUuid(destinatarioId)) {
    return NextResponse.json({ ok: false, erro: 'Destinatário inválido.' }, { status: 400 });
  }
  if (!(await contatoPermitido(viewer.id, destinatarioId))) {
    return NextResponse.json({ ok: false, erro: 'Contato não permitido.' }, { status: 403 });
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
      .insert({
        autor_id: viewer.id,
        destinatario_id: destinatarioId,
        mensagem,
      })
      .select('id, autor_id, destinatario_id, mensagem, lido_em, created_at')
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
            destinatario_id: data.destinatario_id,
            mensagem: data.mensagem,
            created_at: data.created_at,
            lido_em: data.lido_em,
            minha: true,
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
