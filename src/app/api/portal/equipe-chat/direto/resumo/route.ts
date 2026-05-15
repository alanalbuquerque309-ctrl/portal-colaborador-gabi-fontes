import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listarContatosEquipe } from '@/lib/equipe-chat-contatos';
import { getEquipeChatViewer, isMissingEquipeChatTable } from '@/lib/equipe-chat-auth';

export async function GET() {
  const viewer = await getEquipeChatViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  try {
    const contatos = await listarContatosEquipe(viewer.id);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('equipe_chat_mensagens')
      .select('id, autor_id, destinatario_id, mensagem, created_at, lido_em')
      .not('destinatario_id', 'is', null)
      .or(`autor_id.eq.${viewer.id},destinatario_id.eq.${viewer.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      if (isMissingEquipeChatTable(error.message)) {
        return NextResponse.json({
          ok: true,
          conversas: contatos.map((c) => ({ ...c, ultima_mensagem: null, ultima_em: null, nao_lidas: 0 })),
        });
      }
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    const naoLidas = new Map<string, number>();
    const ultima = new Map<string, { mensagem: string; em: string }>();

    for (const row of data ?? []) {
      const autorId = String(row.autor_id);
      const destId = row.destinatario_id ? String(row.destinatario_id) : '';
      const outro = autorId === viewer.id ? destId : destId === viewer.id ? autorId : '';
      if (!outro) continue;

      if (destId === viewer.id && autorId === outro && !row.lido_em) {
        naoLidas.set(outro, (naoLidas.get(outro) ?? 0) + 1);
      }

      if (!ultima.has(outro)) {
        ultima.set(outro, { mensagem: String(row.mensagem ?? ''), em: String(row.created_at ?? '') });
      }
    }

    const conversas = contatos.map((c) => {
      const u = ultima.get(c.id);
      return {
        ...c,
        ultima_mensagem: u?.mensagem ?? null,
        ultima_em: u?.em ?? null,
        nao_lidas: naoLidas.get(c.id) ?? 0,
      };
    });

    conversas.sort((a, b) => {
      if (!a.ultima_em && !b.ultima_em) return a.nome.localeCompare(b.nome, 'pt-BR');
      if (!a.ultima_em) return 1;
      if (!b.ultima_em) return -1;
      return b.ultima_em.localeCompare(a.ultima_em);
    });

    return NextResponse.json({ ok: true, conversas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
