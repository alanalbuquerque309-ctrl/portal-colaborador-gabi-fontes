import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminViewerContext } from '@/lib/admin-auth';
import { podeVerBonificacaoInterna } from '@/lib/bonificacao-access';
import { PAYLOAD_REABRIR_ONBOARDING } from '@/lib/onboarding-reabrir';

function podeExecutar(ctx: Awaited<ReturnType<typeof getAdminViewerContext>>): boolean {
  if (!ctx) return false;
  if (ctx.kind === 'password_session') return true;
  return podeVerBonificacaoInterna(ctx.role);
}

/** Reabre onboarding (vídeo + manuais) sem apagar senha nem perfil. */
export async function POST(req: Request) {
  const ctx = await getAdminViewerContext();
  if (!podeExecutar(ctx)) {
    return NextResponse.json({ ok: false, erro: 'Acesso restrito (sócio/admin)' }, { status: 403 });
  }

  let body: { confirmar?: string; colaborador_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.confirmar !== 'REABRIR') {
    return NextResponse.json(
      {
        ok: false,
        erro: 'Envie JSON { "confirmar": "REABRIR" } para confirmar. Opcional: "colaborador_id" (UUID) para um só.',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const payload = { ...PAYLOAD_REABRIR_ONBOARDING, updated_at: new Date().toISOString() };

    let q = supabase.from('colaboradores').update(payload).not('senha_hash', 'is', null).select('id');

    if (body.colaborador_id?.trim()) {
      q = supabase
        .from('colaboradores')
        .update(payload)
        .eq('id', body.colaborador_id.trim())
        .select('id');
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      msg: body.colaborador_id
        ? 'Onboarding reaberto para o colaborador informado.'
        : 'Onboarding reaberto para todos com senha já definida.',
      total: data?.length ?? 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
