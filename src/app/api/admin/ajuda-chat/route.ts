import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canResponderAjudaFinal, canVisualizarAjuda } from '@/lib/roles';

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
  };
}

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const somentePendentes = searchParams.get('somente_pendentes') === '1';

  try {
    const supabase = createAdminClient();
    let q = supabase
      .from('ajuda_chat')
      .select(
        'id, colaborador_id, unidade_id, mensagem, resposta, created_at, respondido_em, lido_admin_em, colaboradores!ajuda_chat_colaborador_id_fkey(nome, telefone), respondido_por:colaboradores!ajuda_chat_respondido_por_id_fkey(nome), unidades(nome)'
      )
      .order('created_at', { ascending: false })
      .limit(300);
    if (somentePendentes) q = q.is('respondido_em', null);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

    const itens = (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      colaborador_id: r.colaborador_id,
      colaborador_nome: (r.colaboradores as { nome?: string } | null)?.nome ?? 'Colaborador',
      colaborador_telefone: (r.colaboradores as { telefone?: string } | null)?.telefone ?? null,
      unidade_nome: (r.unidades as { nome?: string } | null)?.nome ?? '-',
      mensagem: r.mensagem,
      resposta: r.resposta,
      created_at: r.created_at,
      respondido_em: r.respondido_em,
      lido_admin_em: r.lido_admin_em,
      respondido_por_nome: (r.respondido_por as { nome?: string } | null)?.nome ?? null,
    }));

    const { count } = await supabase
      .from('ajuda_chat')
      .select('id', { count: 'exact', head: true })
      .is('respondido_em', null);

    return NextResponse.json({
      ok: true,
      itens,
      pendentes: typeof count === 'number' ? count : 0,
      pode_responder: viewer.podeResponder,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
