import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canVisualizarAjuda } from '@/lib/roles';
import { contarTopicosPendentes, type AjudaChatLinha } from '@/lib/ajuda-chat-threads';

export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error: errEu } = await supabase
      .from('colaboradores')
      .select('id, role')
      .eq('id', colaboradorId)
      .maybeSingle();
    const role = (eu as { role?: string } | null)?.role;
    if (errEu || !eu || !canVisualizarAjuda(role, colaboradorId)) {
      return NextResponse.json({ ok: true, pendentes: 0 });
    }

    const { data, error } = await supabase
      .from('ajuda_chat')
      .select('id, colaborador_id, mensagem, resposta, created_at, respondido_em')
      .is('respondido_em', null)
      .limit(500);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    const pendentes = contarTopicosPendentes((data ?? []) as AjudaChatLinha[]);
    return NextResponse.json({ ok: true, pendentes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
