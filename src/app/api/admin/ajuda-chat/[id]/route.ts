import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canResponderAjudaFinal } from '@/lib/roles';

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
    const payload: Record<string, unknown> = {};
    if (marcarLido) payload.lido_admin_em = new Date().toISOString();
    if (resposta != null) {
      payload.resposta = resposta;
      payload.respondido_em = new Date().toISOString();
      payload.respondido_por_id = viewer.id;
      payload.lido_admin_em = new Date().toISOString();
    }

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
