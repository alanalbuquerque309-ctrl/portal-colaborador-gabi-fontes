import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Retorna dados do perfil do colaborador logado. */
export async function GET() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('colaboradores')
      .select(
        'nome, email, telefone, cargo, setor, foto_url, role, onboarding_completo, onboarding_video_visto, onboarding_quiz_video_ok, onboarding_manual_geral_lido_ok, onboarding_quiz_manual_geral_ok, onboarding_manual_escolhido_file, onboarding_manual_escolhido_concluido, unidades(nome)'
      )
      .eq('id', colaboradorId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const unidade = Array.isArray(data.unidades) ? data.unidades[0] : data.unidades;
    const unidadeNome = unidade && typeof unidade === 'object' && 'nome' in unidade ? unidade.nome : undefined;

    return NextResponse.json({
      ok: true,
      colaborador: {
        nome: data.nome ?? '',
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        cargo: data.cargo ?? null,
        setor: (data as { setor?: string | null }).setor ?? null,
        foto_url: data.foto_url ?? null,
        role: (data as { role?: string }).role ?? null,
        unidades: unidadeNome != null ? { nome: unidadeNome } : undefined,
        onboarding_completo: !!(data as { onboarding_completo?: boolean }).onboarding_completo,
        onboarding_video_visto: !!(data as { onboarding_video_visto?: boolean }).onboarding_video_visto,
        onboarding_quiz_video_ok: !!(data as { onboarding_quiz_video_ok?: boolean }).onboarding_quiz_video_ok,
        onboarding_manual_geral_lido_ok: !!(data as { onboarding_manual_geral_lido_ok?: boolean })
          .onboarding_manual_geral_lido_ok,
        onboarding_quiz_manual_geral_ok: !!(data as { onboarding_quiz_manual_geral_ok?: boolean })
          .onboarding_quiz_manual_geral_ok,
        onboarding_manual_escolhido_file:
          (data as { onboarding_manual_escolhido_file?: string | null }).onboarding_manual_escolhido_file ?? null,
        onboarding_manual_escolhido_concluido: !!(data as { onboarding_manual_escolhido_concluido?: boolean })
          .onboarding_manual_escolhido_concluido,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
