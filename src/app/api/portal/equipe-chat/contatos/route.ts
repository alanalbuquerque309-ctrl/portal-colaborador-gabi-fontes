import { NextResponse } from 'next/server';
import { getEquipeChatViewer } from '@/lib/equipe-chat-auth';
import { listarContatosEquipe } from '@/lib/equipe-chat-contatos';

export async function GET() {
  const viewer = await getEquipeChatViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  try {
    const contatos = await listarContatosEquipe(viewer.id);
    return NextResponse.json({ ok: true, contatos, eu: { id: viewer.id, nome: viewer.nome } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
