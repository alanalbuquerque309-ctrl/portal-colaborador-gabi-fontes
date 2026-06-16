import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canResponderAjudaFinal, canExcluirMensagensAjuda } from '@/lib/roles';
import { idsPendentesDoTopico, type AjudaChatLinha } from '@/lib/ajuda-chat-threads';

function sanitize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function getViewer() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('colaboradores').select('id, role').eq('id', colaboradorId).maybeSingle();
  if (!data) return null;
  const role = (data as { role?: string }).role;
  if (!canResponderAjudaFinal(colaboradorId, role)) return null;
  return { id: String(data.id) };
}

async function getViewerExcluir() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('colaboradores').select('id, role').eq('id', colaboradorId).maybeSingle();
  if (!data) return null;
  const role = (data as { role?: string }).role;
  if (!canExcluirMensagensAjuda(role)) return null;
  return { id: String(data.id) };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  const id = String(params.id ?? '').trim();
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  let body: { resposta?: string; marcar_lido?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Corpo inválido' }, { status: 400 });
  }

  const resposta = body.resposta != null ? sanitize(String(body.resposta)) : null;
  const marcarLido = body.marcar_lido === true;
  if (!marcarLido && (resposta == null || resposta.length < 2)) {
    return NextResponse.json({ ok: false, erro: 'Resposta muito curta.' }, { status: 400 });
  }
  if (resposta && resposta.length > 1500) {
    return NextResponse.json({ ok: false, erro: 'Resposta muito longa (máx. 1500 caracteres).' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    if (resposta != null) {
      const { data: alvo, error: errAlvo } = await supabase
        .from('ajuda_chat')
        .select('id, colaborador_id')
        .eq('id', id)
        .maybeSingle();
      if (errAlvo) return NextResponse.json({ ok: false, erro: errAlvo.message }, { status: 500 });
      if (!alvo) return NextResponse.json({ ok: false, erro: 'Mensagem não encontrada.' }, { status: 404 });

      const colaboradorId = String((alvo as { colaborador_id?: string }).colaborador_id ?? '');
      const { data: linhasColab, error: errLinhas } = await supabase
        .from('ajuda_chat')
        .select('id, colaborador_id, mensagem, resposta, created_at, respondido_em')
        .eq('colaborador_id', colaboradorId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (errLinhas) return NextResponse.json({ ok: false, erro: errLinhas.message }, { status: 500 });

      const idsResponder = idsPendentesDoTopico((linhasColab ?? []) as AjudaChatLinha[], id);
      const agora = new Date().toISOString();
      const payload = {
        resposta,
        respondido_em: agora,
        respondido_por_id: viewer.id,
        lido_admin_em: agora,
      };

      const { data, error } = await supabase
        .from('ajuda_chat')
        .update(payload)
        .in('id', idsResponder)
        .select('id, resposta, respondido_em, lido_admin_em');
      if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, itens: data, respondidos: idsResponder.length });
    }

    const payload: Record<string, unknown> = {};
    if (marcarLido) payload.lido_admin_em = new Date().toISOString();

    const { data, error } = await supabase
      .from('ajuda_chat')
      .update(payload)
      .eq('id', id)
      .select('id, resposta, respondido_em, lido_admin_em')
      .single();
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const viewer = await getViewerExcluir();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  const id = String(params.id ?? '').trim();
  if (!id) return NextResponse.json({ ok: false, erro: 'ID inválido' }, { status: 400 });

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('ajuda_chat').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
