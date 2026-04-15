import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

type Body = {
  onboarding_video_visto?: boolean;
  onboarding_quiz_video_ok?: boolean;
  onboarding_manual_geral_lido_ok?: boolean;
  onboarding_quiz_manual_geral_ok?: boolean;
  onboarding_manual_escolhido_file?: string | null;
  onboarding_manual_escolhido_concluido?: boolean;
  /** zera progresso do vídeo + quiz vídeo (após 2 erros no quiz do vídeo) */
  reset_video_e_quiz?: boolean;
  /** zera leitura geral + quiz manual (após 2 erros no quiz do manual) */
  reset_manual_geral_e_quiz?: boolean;
};

/**
 * Atualiza etapas do primeiro acesso. Só o colaborador logado pode alterar o próprio registro.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.reset_video_e_quiz) {
    payload.onboarding_video_visto = false;
    payload.onboarding_quiz_video_ok = false;
  }
  if (body.reset_manual_geral_e_quiz) {
    payload.onboarding_manual_geral_lido_ok = false;
    payload.onboarding_quiz_manual_geral_ok = false;
  }

  if (body.onboarding_video_visto !== undefined) payload.onboarding_video_visto = body.onboarding_video_visto;
  if (body.onboarding_quiz_video_ok !== undefined) payload.onboarding_quiz_video_ok = body.onboarding_quiz_video_ok;
  if (body.onboarding_manual_geral_lido_ok !== undefined) {
    payload.onboarding_manual_geral_lido_ok = body.onboarding_manual_geral_lido_ok;
  }
  if (body.onboarding_quiz_manual_geral_ok !== undefined) {
    payload.onboarding_quiz_manual_geral_ok = body.onboarding_quiz_manual_geral_ok;
  }
  if (body.onboarding_manual_escolhido_file !== undefined) {
    payload.onboarding_manual_escolhido_file = body.onboarding_manual_escolhido_file;
  }
  if (body.onboarding_manual_escolhido_concluido !== undefined) {
    payload.onboarding_manual_escolhido_concluido = body.onboarding_manual_escolhido_concluido;
  }

  if (Object.keys(payload).length <= 1) {
    return NextResponse.json({ ok: false, erro: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('colaboradores').update(payload).eq('id', colaboradorId);

    if (error) {
      return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
