import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { podeVerDetalheNotasAvaliacaoAdmin } from '@/lib/admin-access';
import { requireAdminFullApi } from '@/lib/admin-auth';

/**
 * Remove permanentemente uma avaliação semanal (sócio / admin / sessão por senha).
 */
export async function POST(req: Request) {
  const auth = await requireAdminFullApi();
  if (!auth.ok) return auth.response;

  const role = auth.ctx.kind === 'portal' ? auth.ctx.role : null;
  const senhaAdmin = auth.ctx.kind === 'password_session';
  if (!podeVerDetalheNotasAvaliacaoAdmin(role, senhaAdmin)) {
    return NextResponse.json({ ok: false, erro: 'Sem permissão para apagar avaliações.' }, { status: 403 });
  }

  let body: { avaliacao_id?: string; confirmar_exclusao?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const avaliacaoId = String(body.avaliacao_id ?? '').trim();
  if (!avaliacaoId) {
    return NextResponse.json({ ok: false, erro: 'avaliacao_id obrigatório' }, { status: 400 });
  }
  if (body.confirmar_exclusao !== true) {
    return NextResponse.json({ ok: false, erro: 'Confirmação de exclusão obrigatória.' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: existente, error: errGet } = await supabase
      .from('avaliacoes_diarias')
      .select('id')
      .eq('id', avaliacaoId)
      .maybeSingle();

    if (errGet) {
      return NextResponse.json({ ok: false, erro: errGet.message }, { status: 500 });
    }
    if (!existente?.id) {
      return NextResponse.json({ ok: false, erro: 'Avaliação não encontrada.' }, { status: 404 });
    }

    const { error: errDel } = await supabase.from('avaliacoes_diarias').delete().eq('id', avaliacaoId);
    if (errDel) {
      return NextResponse.json({ ok: false, erro: errDel.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: avaliacaoId, apagada: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
