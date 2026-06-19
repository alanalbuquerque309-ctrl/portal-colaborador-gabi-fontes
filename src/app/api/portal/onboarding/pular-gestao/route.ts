import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  roleExigeOnboarding,
  sincronizarOnboardingGestaoNoBanco,
} from '@/lib/onboarding-access';
import { normalizePortalRole } from '@/lib/roles';

/** Marca onboarding concluído para sócio/admin/gerente (não passam pelo vídeo de colaborador). */
export async function POST() {
  const cookieStore = await cookies();
  const colaboradorId = cookieStore.get('portal_colaborador_id')?.value;
  if (!colaboradorId || colaboradorId === 'pending') {
    return NextResponse.json({ ok: false, erro: 'Faça login no portal' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: eu, error } = await supabase
      .from('colaboradores')
      .select('id, role, onboarding_completo')
      .eq('id', colaboradorId)
      .maybeSingle();

    if (error || !eu?.id) {
      return NextResponse.json({ ok: false, erro: 'Perfil não encontrado' }, { status: 404 });
    }

    const role = normalizePortalRole((eu as { role?: string }).role);
    if (roleExigeOnboarding(role)) {
      return NextResponse.json(
        { ok: false, erro: 'Onboarding completo é obrigatório para colaboradores.' },
        { status: 403 }
      );
    }

    await sincronizarOnboardingGestaoNoBanco(
      supabase,
      colaboradorId,
      role,
      (eu as { onboarding_completo?: boolean }).onboarding_completo
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
