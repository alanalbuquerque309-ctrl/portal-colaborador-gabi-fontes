import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { aplicarEscalasJunho2026 } from '@/lib/aplicar-escalas-junho-2026';

/** Grava escalas de junho/2026 (documento Folgas de domingo) no Supabase. */
export async function POST() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const result = await aplicarEscalasJunho2026(supabase);

    if (!result.ok && result.aplicados === 0) {
      const { ok: _ok, ...rest } = result;
      return NextResponse.json(
        {
          ok: false,
          erro: result.erros[0] ?? 'Não foi possível aplicar escalas de junho.',
          ...rest,
        },
        { status: result.erros.some((e) => /036|migration/i.test(e)) ? 503 : 500 }
      );
    }

    return NextResponse.json({ ...result, ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
